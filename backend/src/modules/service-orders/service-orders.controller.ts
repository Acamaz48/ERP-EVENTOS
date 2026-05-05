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

  // 🛠️ ACESSO DA PRODUÇÃO

  @Post()
  @Roles(UserRole.PRODUCAO)
  create(@Body() dto: CreateOrUpdateOrderDto, @Request() req) {
    return this.osService.createServiceOrder(req.user.userId, dto);
  }

  @Put(':id')
  @Roles(UserRole.PRODUCAO)
  update(@Param('id') id: string, @Body() dto: CreateOrUpdateOrderDto) {
    return this.osService.updateServiceOrder(id, dto);
  }

  @Post(':id/send')
  @Roles(UserRole.PRODUCAO)
  sendToWarehouse(@Param('id') id: string) {
    return this.osService.sendToWarehouse(id);
  }


  // 📦 ACESSO DO GALPÃO

  @Post(':id/submit')
  @Roles(UserRole.GALPAO)
  submit(@Param('id') id: string) {
    // Note que não há envio de Body. A decisão é 100% backend.
    return this.osService.submitFromWarehouse(id);
  }
}