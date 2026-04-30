import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        name: createDto.name,
        latitude: createDto.latitude,
        longitude: createDto.longitude,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
        status: createDto.status,
      },
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startDate: 'asc' }, // Traz os eventos mais próximos primeiro
    });
  }

  // --- NOVOS MÉTODOS DE CRUD ABAIXO ---

  async findOne(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async update(id: string, updateDto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...updateDto,
        // Se a data vier na requisição, convertemos para Date. Se não, ignoramos (undefined).
        startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    // Nota de Arquiteto: Em produção real, é melhor mudar o status para 'DELETED' (Soft Delete).
    // Mas para manter a simplicidade do nosso CRUD agora, vamos deletar fisicamente.
    return this.prisma.event.delete({ where: { id } });
  }
}