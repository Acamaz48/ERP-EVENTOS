import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

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
}