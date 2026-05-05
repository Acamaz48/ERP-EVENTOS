import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceOrderStatus, UserRole, ServiceOrderItemStatus } from '@prisma/client';

export class OrderItemDto {
  materialId!: string;
  operationalUnitId!: string;
  quantity!: number;
}

export class CreateOrUpdateOrderDto {
  eventId!: string; 
  supplier?: string;
  items!: OrderItemDto[];
}

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  // 1. CRIAÇÃO PELA PRODUÇÃO (Nasce como DRAFT)
  async createServiceOrder(userId: string, data: CreateOrUpdateOrderDto) {
    if (!data.items?.length) throw new BadRequestException('Ordem deve conter materiais.');

    return this.prisma.serviceOrder.create({
      data: {
        userId,
        eventId: data.eventId, 
        supplier: data.supplier,
        status: ServiceOrderStatus.DRAFT,
        items: {
          create: data.items.map(item => ({
            materialId: item.materialId,
            operationalUnitId: item.operationalUnitId,
            quantity: item.quantity,
            status: ServiceOrderItemStatus.ADDED,
          })),
        },
      },
      include: { items: true },
    });
  }

  // 2. ATUALIZAÇÃO (Rastreabilidade via ADDED/REMOVED)
  async updateServiceOrder(orderId: string, role: UserRole, data: CreateOrUpdateOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { items: { where: { status: ServiceOrderItemStatus.ADDED } } },
    });
    
    if (!order) throw new NotFoundException('OS não encontrada.');
    
    // CORREÇÃO 1: Substituído o .includes() por verificações explícitas
    if (role === UserRole.PRODUCAO && order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Produção só pode editar em DRAFT ou PENDING.');
    }
    if (role === UserRole.GALPAO && order.status !== ServiceOrderStatus.ACTIVE) {
      throw new BadRequestException('Galpão só pode editar ordens ACTIVE.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Todos os itens atuais são marcados como REMOVED (invalidados)
      if (order.items.length > 0) {
        await tx.serviceOrderItem.updateMany({
          where: { serviceOrderId: orderId, status: ServiceOrderItemStatus.ADDED },
          data: { status: ServiceOrderItemStatus.REMOVED },
        });
      }

      // Inserimos a nova configuração como ADDED
      await tx.serviceOrderItem.createMany({
        data: data.items.map(item => ({
          serviceOrderId: orderId,
          materialId: item.materialId,
          operationalUnitId: item.operationalUnitId,
          quantity: item.quantity,
          status: ServiceOrderItemStatus.ADDED,
        })),
      });

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: {
          eventId: data.eventId,
          supplier: data.supplier
        },
        include: { items: { where: { status: ServiceOrderItemStatus.ADDED } } },
      });
    });
  }

  // 3. SUBMISSÃO INTELIGENTE (Máquina de Estados)
  async submitServiceOrder(orderId: string, role: UserRole) {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('OS não encontrada.');

    let newStatus: ServiceOrderStatus;

    if (role === UserRole.PRODUCAO) {
      // CORREÇÃO 2: Substituído o .includes() por verificações explícitas
      if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
        throw new BadRequestException('Produção só pode submeter ordens DRAFT ou PENDING.');
      }
      newStatus = ServiceOrderStatus.ACTIVE; // Vai para o Galpão
    } 
    else if (role === UserRole.GALPAO) {
      if (order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException('Galpão só pode submeter ordens ACTIVE.');
      }
      newStatus = ServiceOrderStatus.PENDING; // Retorna para a Produção
    } 
    else {
      throw new BadRequestException('Cargo inválido para esta operação.');
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }

  // 4. FINALIZAÇÃO DA PRODUÇÃO (Atingindo o READY)
  async finalizeServiceOrder(orderId: string, role: UserRole) {
    if (role !== UserRole.PRODUCAO) throw new BadRequestException('Apenas Produção pode finalizar (READY).');
    
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (order?.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Apenas ordens PENDING (validadas pelo galpão) podem ser finalizadas.');
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: ServiceOrderStatus.READY },
    });
  }
}