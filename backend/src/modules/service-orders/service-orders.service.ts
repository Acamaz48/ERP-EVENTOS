import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceOrderStatus, UserRole, ServiceOrderItemStatus } from '@prisma/client';
import { CreateServiceOrderDto, UpdateServiceOrderDto } from './dto/service-order.dto';

/**
 * ServiceOrdersService - Core Logístico do ERP Vivere
 * * Este serviço é o "Aggregate Root" da operação. Ele gerencia o ciclo de vida
 * das Ordens de Serviço (OS), a reserva de estoque e a integração com eventos.
 */
@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 🚀 CRIAÇÃO UNIFICADA E RESERVA DE ESTOQUE
  // ==========================================
  
  /**
   * Cria uma Ordem de Serviço vinculada a um novo Evento.
   * Utiliza transações atômicas para garantir que o estoque seja reservado
   * apenas se o evento e o endereço forem criados com sucesso.
   */
  async createServiceOrder(userId: string, data: CreateServiceOrderDto) {
    // Iniciamos uma transação para garantir integridade (All-or-Nothing)
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Validação e Reserva de Estoque Lógico (Prevenção de Overbooking)
      // Antes de criar qualquer coisa, verificamos se o galpão tem o que a produção pede.
      for (const item of data.items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        
        if (!material) {
          throw new NotFoundException(`O material com ID ${item.materialId} não existe no catálogo.`);
        }

        // Regra de Ouro: Se a produção pede 10 e só temos 9, a transação falha aqui.
        if (material.stock < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para [${material.name}]. Solicitado: ${item.quantity}, Disponível: ${material.stock}.`
          );
        }

        // Decrementamos o estoque 'lógico'. A peça ainda está no galpão, mas já está "prometida".
        await tx.material.update({
          where: { id: item.materialId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 2. Criação Encadeada: Endereço -> Evento
      const event = await tx.event.create({
        data: {
          name: data.eventName,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          status: 'PENDING', // Status inicial do planejamento
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

      // 3. Persistência da Ordem de Serviço
      return tx.serviceOrder.create({
        data: {
          userId,
          eventId: event.id, 
          supplier: data.supplier,
          status: ServiceOrderStatus.DRAFT, // Nasce como rascunho
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
          items: { include: { material: true } }
        },
      });
    });
  }

  // ==========================================
  // 🔍 CONSULTAS E LISTAGENS
  // ==========================================

  /**
   * Retorna todas as OSs com relacionamentos completos para o Dashboard.
   */
  async findAll() {
    return this.prisma.serviceOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        event: { include: { address: true } },
        items: { 
          where: { status: ServiceOrderItemStatus.ADDED }, 
          include: { material: true } 
        },
        user: { select: { name: true, email: true } }
      }
    });
  }

  /**
   * Busca detalhes de uma OS específica para edição ou visualização.
   */
  async findOne(id: string) {
    const os = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        event: { include: { address: true } },
        items: { 
          where: { status: ServiceOrderItemStatus.ADDED }, 
          include: { material: true } 
        },
      }
    });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada.');
    return os;
  }

  // ==========================================
  // ✏️ GESTÃO DE ATUALIZAÇÕES
  // ==========================================

  /**
   * Atualiza dados da OS e do Evento.
   * Implementa regras de negócio baseadas no cargo (RBAC).
   */
  async updateServiceOrder(orderId: string, role: UserRole, data: UpdateServiceOrderDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { event: true }
    });
    
    if (!order) throw new NotFoundException('OS não encontrada.');
    
    // Bloqueios de Segurança: Impede que o Galpão edite rascunhos ou a Produção edite cargas em trânsito.
    if (role === UserRole.PRODUCAO && order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('A Produção só pode editar OS em DRAFT ou PENDING (devolvida).');
    }
    if (role === UserRole.GALPAO && order.status !== ServiceOrderStatus.ACTIVE) {
      throw new BadRequestException('O Galpão só pode editar ordens com status ACTIVE.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Sincroniza dados do evento (nome e datas)
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

      // Lógica de Itens: Invalida os antigos e adiciona os novos para manter histórico (REMOVED)
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
  // ⚙️ MÁQUINA DE ESTADOS (WORKFLOW)
  // ==========================================

  /**
   * Altera o status da OS conforme o fluxo logístico.
   */
  async submitServiceOrder(orderId: string, role: UserRole) {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('OS não encontrada.');

    let newStatus: ServiceOrderStatus;

    if (role === UserRole.PRODUCAO) {
      if (order.status !== ServiceOrderStatus.DRAFT && order.status !== ServiceOrderStatus.PENDING) {
        throw new BadRequestException('Produção: Só é possível enviar ordens Rascunho ou Pendentes.');
      }
      newStatus = ServiceOrderStatus.ACTIVE; // Envia ao Galpão
    } 
    else if (role === UserRole.GALPAO) {
      if (order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException('Galpão: Só é possível processar ordens Ativas.');
      }
      newStatus = ServiceOrderStatus.PENDING; // Devolve para conferência da Produção
    } 
    else {
      throw new BadRequestException('Cargo sem permissão para transição de status.');
    }

    return this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: { event: true } 
    });
  }

  /**
   * Finaliza a OS, ativando o evento no mapa e liberando a carga para saída.
   */
  async finalizeServiceOrder(orderId: string, role: UserRole) {
    if (role !== UserRole.PRODUCAO) {
      throw new BadRequestException('Aprovação final é restrita ao cargo de PRODUÇÃO.');
    }
    
    const order = await this.prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (order?.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Apenas ordens validadas pelo galpão (PENDING) podem ser finalizadas.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Sincroniza o Evento como Ativo para aparecer nos mapas e calendários operacionais
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
  // 🗑️ EXCLUSÃO E ESTORNO DE ESTOQUE
  // ==========================================

  /**
   * Remove a OS e o Evento associado, devolvendo o estoque reservado.
   */
  async deleteServiceOrder(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({ 
      where: { id: orderId },
      include: { 
        event: true, 
        items: { where: { status: ServiceOrderItemStatus.ADDED } } 
      } 
    });
    
    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      // Estorno: Devolvemos as quantidades reservadas ao saldo do catálogo
      for (const item of order.items) {
        await tx.material.update({
          where: { id: item.materialId },
          data: { stock: { increment: item.quantity } }
        });
      }

      // Limpeza física (de dentro para fora para evitar erros de FK)
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: orderId } });
      await tx.serviceOrder.delete({ where: { id: orderId } });
      await tx.event.delete({ where: { id: order.eventId } });
      
      if (order.event.addressId) {
        await tx.address.delete({ where: { id: order.event.addressId } });
      }
      return { message: 'Ordem de Serviço excluída. Estoque estornado com sucesso.' };
    });
  }

  // ==========================================
  // 🛡️ LOGÍSTICA FÍSICA (FUTURO: QR CODE)
  // ==========================================

  /**
   * Método preparado para vinculação de itens serializados (QR Code).
   * Altera o status do PhysicalItem para 'RESERVED' ao ser bipado no galpão.
   */
  async bindScannedPhysicalItem(orderId: string, serviceOrderItemId: string, physicalItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({ where: { id: orderId } });
      if (!order || order.status !== ServiceOrderStatus.ACTIVE) {
        throw new BadRequestException('Bipagem permitida apenas em ordens com status ACTIVE.');
      }

      const physicalItem = await tx.physicalItem.findUnique({ where: { id: physicalItemId } });
      if (!physicalItem || physicalItem.status !== 'AVAILABLE') {
        throw new BadRequestException('Este item físico não está disponível ou já está em outro evento.');
      }

      return tx.physicalItem.update({
        where: { id: physicalItemId },
        data: {
          status: 'RESERVED',
          serviceOrderItemId: serviceOrderItemId
        }
      });
    });
  }
}
