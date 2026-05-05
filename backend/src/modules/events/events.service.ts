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
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
        status: createDto.status,
        // O Prisma cria o Endereço na tabela Address e já faz a ligação (relação) com o Evento!
        address: {
          create: {
            latitude: createDto.latitude,
            longitude: createDto.longitude,
            street: createDto.street,
            city: createDto.city,
            state: createDto.state,
          } 
        }
      },
      include: { address: true } // Traz os dados do endereço na resposta do Postman/Frontend
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startDate: 'asc' },
      include: { address: true }, 
    });
  }

  async findOne(id: string) {
    return this.prisma.event.findUnique({ 
      where: { id },
      include: { address: true }
    });
  }

  async update(id: string, updateDto: UpdateEventDto) {
    // Separamos os campos de Evento dos campos de Endereço usando desestruturação
    const { latitude, longitude, ...eventData } = updateDto;

    return this.prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        startDate: eventData.startDate ? new Date(eventData.startDate) : undefined,
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
        
        // Se a pessoa enviou latitude ou longitude na edição, atualizamos a tabela Address
        ...( (latitude !== undefined || longitude !== undefined) && {
          address: {
            update: { latitude, longitude }
          }
        })
      },
      include: { address: true }
    });
  }

  async remove(id: string) {
    // Busca o evento para pegar o ID do endereço antes de deletar
    const event = await this.prisma.event.findUnique({ where: { id } });
    
    return this.prisma.$transaction(async (tx) => {
      // 1. Deleta o Evento
      const deletedEvent = await tx.event.delete({ where: { id } });
      
      // 2. Deleta o Endereço órfão (opcional, mas mantém o banco limpo)
      if (event?.addressId) {
        await tx.address.delete({ where: { id: event.addressId } });
      }
      
      return deletedEvent;
    });
  }
}