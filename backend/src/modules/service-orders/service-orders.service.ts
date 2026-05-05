import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// ADICIONADO: Importação do 'Prisma' para manipular os campos JSON corretamente
import { ServiceOrderStatus, Prisma } from '@prisma/client'; 

// CORREÇÃO 1: Mudado de 'interface' para 'class' para o NestJS conseguir ler no Controller
export class CreateOrUpdateOrderDto {
  eventId!: string;
  supplier?: string;
  items!: { materialId: string; quantity: number }[];
}

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  // 1. PRODUÇÃO: Criação inicial
  async createServiceOrder(userId: string, data: CreateOrUpdateOrderDto) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('A OS deve conter materiais.');
    }

    return this.prisma.serviceOrder.create({
      data: {
        userId,
        eventId: data.eventId,
        supplier: data.supplier,
        status: ServiceOrderStatus.ACTIVE,
        items: {
          create: data.items.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  // 2. PRODUÇÃO: Edição da OS (Aplicável em ACTIVE ou ADJUSTMENT)
  async updateServiceOrder(orderId: string, data: CreateOrUpdateOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    
    if (!order) throw new NotFoundException('OS não encontrada.');
    
    // CORREÇÃO 2: Verificação explícita substituindo o .includes()
    if (order.status !== ServiceOrderStatus.ACTIVE && order.status !== ServiceOrderStatus.ADJUSTMENT) {
      throw new BadRequestException(`Edição não permitida no status atual (${order.status}).`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Removemos itens antigos e inserimos os novos
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: orderId } });

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: {
          eventId: data.eventId,
          supplier: data.supplier,
          missingItems: Prisma.DbNull, // CORREÇÃO 3: Jeito correto de limpar JSON no Prisma
          items: {
            create: data.items.map(item => ({
              materialId: item.materialId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  // 3. PRODUÇÃO: Envia para o Galpão
  async sendToWarehouse(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('OS não encontrada.');
    
    if (order.status !== ServiceOrderStatus.ACTIVE && order.status !== ServiceOrderStatus.ADJUSTMENT) {
      throw new BadRequestException('Apenas OS em ACTIVE ou ADJUSTMENT podem ser enviadas.');
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: ServiceOrderStatus.ANALYSIS },
    });
  }

  // 4. GALPÃO: Submit Inteligente (A Mágica)
  async submitFromWarehouse(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { material: true } } },
      });

      if (!order) throw new NotFoundException('OS não encontrada.');
      if (order.status !== ServiceOrderStatus.ANALYSIS) {
        throw new BadRequestException('Apenas OS em ANALYSIS podem ser submetidas pelo galpão.');
      }

      // CORREÇÃO 4: Definido o tipo do array como any[] para não dar erro de 'never'
      const missingItemsSnapshot: any[] = []; 

      // Avalia cada item da OS contra o banco em tempo real
      for (const item of order.items) {
        if (item.material.stock < item.quantity) {
          missingItemsSnapshot.push({
            materialId: item.materialId,
            materialName: item.material.name,
            requested: item.quantity,
            available: item.material.stock,
            deficit: item.quantity - item.material.stock
          });
        }
      }

      // CASO 2 - ESTOQUE INSUFICIENTE
      if (missingItemsSnapshot.length > 0) {
        return tx.serviceOrder.update({
          where: { id: orderId },
          data: {
            status: ServiceOrderStatus.ADJUSTMENT,
            missingItems: missingItemsSnapshot, // Salva o log do que faltou
          },
        });
      }

      // CASO 1 - ESTOQUE SUFICIENTE: Abate do estoque e aprova
      for (const item of order.items) {
        await tx.material.update({
          where: { id: item.materialId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: {
          status: ServiceOrderStatus.READY,
          missingItems: Prisma.DbNull, // CORREÇÃO 3: Apaga erros passados
        },
      });
    });
  }
}