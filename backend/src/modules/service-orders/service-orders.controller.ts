import { Controller, Post, Get, Body, UseGuards, Request, Param, Patch, Delete } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('service-orders')
@UseGuards(JwtAuthGuard) // Protege todas as rotas deste controller
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  create(@Body() createDto: CreateServiceOrderDto, @Request() req) {
    // O ID do usuário vem do token JWT (anexado pelo nosso Guard/Strategy)
    return this.serviceOrdersService.create(createDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.serviceOrdersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateServiceOrderDto) {
    return this.serviceOrdersService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceOrdersService.remove(id);
  }
}