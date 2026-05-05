import { Controller, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ServiceOrdersService, CreateOrUpdateOrderDto } from './service-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly osService: ServiceOrdersService) {}

  // 🛠️ CRIAÇÃO: Apenas Produção
  @Post()
  @Roles(UserRole.PRODUCAO)
  create(@Body() dto: CreateOrUpdateOrderDto, @Request() req) {
    return this.osService.createServiceOrder(req.user.userId, dto);
  }

  // ✏️ EDIÇÃO: Produção e Galpão
  @Put(':id')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO)
  update(@Param('id') id: string, @Body() dto: CreateOrUpdateOrderDto, @Request() req) {
    return this.osService.updateServiceOrder(id, req.user.role, dto);
  }

  // 🚀 SUBMIT ÚNICO: Produção ou Galpão (O Service roteia o status dependendo de quem chamou)
  @Post(':id/submit')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO)
  submit(@Param('id') id: string, @Request() req) {
    return this.osService.submitServiceOrder(id, req.user.role);
  }

  // ✅ FINALIZAÇÃO: Apenas Produção valida o que o galpão ajustou
  @Post(':id/ready')
  @Roles(UserRole.PRODUCAO)
  finalize(@Param('id') id: string, @Request() req) {
    return this.osService.finalizeServiceOrder(id, req.user.role);
  }
}