import { Controller, Post, Put, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto, UpdateServiceOrderDto } from './dto/service-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly osService: ServiceOrdersService) {}

  // 📋 LISTAGEM GERAL
  @Get()
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN)
  findAll() {
    return this.osService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.osService.findOne(id);
  }

  // 🛠️ CRIAÇÃO UNIFICADA: Apenas Produção
  @Post()
  @Roles(UserRole.PRODUCAO)
  create(@Body() dto: CreateServiceOrderDto, @Request() req) {
    return this.osService.createServiceOrder(req.user.userId, dto);
  }

  // ✏️ EDIÇÃO: Produção e Galpão
  @Put(':id')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO)
  update(@Param('id') id: string, @Body() dto: UpdateServiceOrderDto, @Request() req) {
    return this.osService.updateServiceOrder(id, req.user.role, dto);
  }

  // 🚀 MÁQUINA DE ESTADOS: Submit (Vai e Volta)
  @Post(':id/submit')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO)
  submit(@Param('id') id: string, @Request() req) {
    return this.osService.submitServiceOrder(id, req.user.role);
  }

  // ✅ FINALIZAÇÃO: Apenas Produção
  @Post(':id/ready')
  @Roles(UserRole.PRODUCAO)
  finalize(@Param('id') id: string, @Request() req) {
    return this.osService.finalizeServiceOrder(id, req.user.role);
  }

  // 🗑️ EXCLUSÃO: Apenas Produção e Admin
  @Delete(':id')
  @Roles(UserRole.PRODUCAO, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.osService.deleteServiceOrder(id);
  }
}