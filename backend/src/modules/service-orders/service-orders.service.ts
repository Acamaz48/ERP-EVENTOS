import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceOrderDto, userId: string) {
    const { eventId, structureIds } = createDto;

    // 1. Validar se o evento existe
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    // 2. Transação: Criar OS e seus itens baseados no Gabarito
    return this.prisma.$transaction(async (tx) => {
      // Cria a Ordem de Serviço
      const os = await tx.serviceOrder.create({
        data: {
          eventId,
          userId,
          status: 'DRAFT',
        },
      });

      // Busca os materiais definidos nos templates das estruturas escolhidas
      const templates = await tx.structureMaterialTemplate.findMany({
        where: { structureId: { in: structureIds } },
      });

      // Agrupa materiais repetidos
      const materialMap = new Map<string, number>();
      templates.forEach((item) => {
        const currentQty = materialMap.get(item.materialId) || 0;
        materialMap.set(item.materialId, currentQty + item.quantity);
      });

      // Cria os itens da OS
      const osItems = Array.from(materialMap.entries()).map(([materialId, quantity]) => ({
        serviceOrderId: os.id,
        materialId,
        quantity,
      }));

      await tx.serviceOrderItem.createMany({ data: osItems });

      return tx.serviceOrder.findUnique({
        where: { id: os.id },
        include: { 
          items: { 
            include: { material: true } 
          } 
        },
      });
    });
  }

  async findAll() {
    return this.prisma.serviceOrder.findMany({
      include: { event: true, items: true },
    });
  }

  // --- NOVOS MÉTODOS DE CRUD ABAIXO ---

  async findOne(id: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id },
      include: { event: true, items: { include: { material: true } } },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    // Exclui os itens da OS primeiro por causa da chave estrangeira, depois deleta a OS
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: id } });
      return tx.serviceOrder.delete({ where: { id } });
    });
  }
}