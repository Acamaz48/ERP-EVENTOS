import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceOrderStatus, UserRole, ServiceOrderItemStatus } from '@prisma/client';
import { CreateServiceOrderDto, UpdateServiceOrderDto } from './dto/service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 🚀 CRIAÇÃO UNIFICADA (EVENTO + OS ATÓMICOS)
  // ==========================================
  async createServiceOrder(userId: string, data: CreateServiceOrderDto) {
    // A Transação garante: ou grava Evento, Endereço e OS, ou desfaz tudo em caso de falha.
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Cria o Evento e o Endereço de forma encadeada
      const event = await tx.event.create({
        data: {
          name: data.eventName,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          status: 'PENDING', // Status logístico do evento
          address: {
            create: {
              latitude: data.latitude,
              longitude: data.longitude,
              street: data.street,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode
            }
          }
        }
      });

      // 2. Cria a OS atrelada ao evento recém-criado
      return tx.serviceOrder.create({
        data: {
          userId,
          eventId: event.id, 
          supplier: data.supplier,
          status: ServiceOrderStatus.DRAFT, // Nasce sempre como DRAFT
          items: {
            create: data.items.map(item => ({
              materialId: item.materialId,
              operationalUnitId: item.operationalUnitId,
              quantity: item.quantity,
              status: ServiceOrderItemStatus.ADDED,
            })),
          },
        },
        include: { 
          event: { include: { address: true } }, 
          items: true 
        },
      });
    });
  }

  // ==========================================
  // 🔍 LISTAGEM
  // ==========================================
  async findAll() {
    return this.prisma.serviceOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        event: { include: { address: true } },
        items: { where: { status: ServiceOrderItemStatus.ADDED } },
        user: { select: { name: true, email: true } }
      }
    });
  }

  async findOne(id: string) {
    const os = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        event: { include: { address: true } },
        items: { where: { status: ServiceOrderItemStatus.ADDED }, include: { material: true } },
      }
    });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada.');
    return os;
  }

  // ==========================================
  // ✏️ EDIÇÃO E ATUALIZAÇÃO
  // ==========================================
  async updateServiceOrder(orderId: string, role: UserRole, data: UpdateServiceOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { event: true }
    });
    
    if (!order) throw new NotFoundException('OS não encontrada.');
    
    // Regras de negócio de edição
    if (role === UserRole.PRODUCAO && order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('A Produção só pode editar OS em DRAFT ou PENDING.');
    }
    if (role === UserRole.GALPAO && order.status !== ServiceOrderStatus.ACTIVE) {
      throw new BadRequestException('O Galpão só pode editar ordens ACTIVE.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Atualiza Evento
      if (data.eventName || data.startDate || data.endDate) {
        await tx.event.update({
          where: { id: order.eventId },
          data: {
            ...(data.eventName && { name: data.eventName }),
            ...(data.startDate && { startDate: new Date(data.startDate) }),
            ...(data.endDate && { endDate: new Date(data.endDate) }),
          }
        });
      }

      // 2. Invalida itens antigos e insere os novos (Rastreabilidade via ADDED/REMOVED)
      if (data.items && data.items.length > 0) {
        await tx.serviceOrderItem.updateMany({
          where: { serviceOrderId: orderId, status: ServiceOrderItemStatus.ADDED },
          data: { status: ServiceOrderItemStatus.REMOVED },
        });

        await tx.serviceOrderItem.createMany({
          data: data.items.map(item => ({
            serviceOrderId: orderId,
            materialId: item.materialId,
            operationalUnitId: item.operationalUnitId,
            quantity: item.quantity,
            status: ServiceOrderItemStatus.ADDED,
          })),
        });
      }

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: { ...(data.supplier && { supplier: data.supplier }) },
        include: { event: true, items: { where: { status: ServiceOrderItemStatus.ADDED } } },
      });
    });
  }

  // ==========================================
  // ⚙️ MÁQUINA DE ESTADOS (WORKFLOW DA OS)
  // ==========================================
  async submitServiceOrder(orderId: string, role: UserRole) {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('OS não encontrada.');

    let newStatus: ServiceOrderStatus;

    if (role === UserRole.PRODUCAO) {
      if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
        throw new BadRequestException('A Produção só pode submeter ordens DRAFT ou PENDING.');
      }
      newStatus = ServiceOrderStatus.ACTIVE; // Envia para o Galpão
    } 
    else if (role === UserRole.GALPAO) {
      if (order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException('O Galpão só pode submeter ordens ACTIVE.');
      }
      newStatus = ServiceOrderStatus.PENDING; // Retorna para a Produção validar
    } 
    else {
      throw new BadRequestException('Cargo inválido para esta operação.');
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: { event: true } 
    });
  }

  async finalizeServiceOrder(orderId: string, role: UserRole) {
    if (role !== UserRole.PRODUCAO) throw new BadRequestException('Apenas a Produção pode finalizar (READY).');
    
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (order?.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Apenas ordens PENDING (validadas pelo galpão) podem ser finalizadas.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Sincroniza o Evento como ACTIVE e a OS como READY
      await tx.event.update({
        where: { id: order.eventId },
        data: { status: 'ACTIVE' }
      });

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: { status: ServiceOrderStatus.READY },
        include: { event: true }
      });
    });
  }

  // ==========================================
  // 🗑️ EXCLUSÃO SEGURA (CASCATA ATÓMICA)
  // ==========================================
  async deleteServiceOrder(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({ 
      where: { id: orderId },
      include: { event: true } 
    });
    
    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada.');

    // Removemos os dados sem quebrar as chaves estrangeiras, de "dentro para fora"
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: orderId } });
      await tx.serviceOrder.delete({ where: { id: orderId } });
      await tx.event.delete({ where: { id: order.eventId } });
      
      // Limpa o endereço que estava associado ao evento
      if (order.event.addressId) {
        await tx.address.delete({ where: { id: order.event.addressId } });
      }
      return { message: 'Ordem de Serviço e Evento excluídos com sucesso.' };
    });
  }
}