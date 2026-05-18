import { Controller, Post, Get, Body, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

// CORREÇÃO: Importação única e consolidada apontando para o nosso novo DTO blindado
import {
  CreateMaterialDto,
  CreateStructureTemplateDto,
  UpdateMaterialDto,
  RegisterStockDto,
} from './dto/material.dto';

@Controller('materials')
// Aplicação do Guard Duplo: Requer estar logado (JWT) e passa o utilizador pelo filtro de cargos (Roles)
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ==========================================
  // 📦 GESTÃO DO CATÁLOGO DE MATERIAIS
  // ==========================================

  @Post()
  @Roles(UserRole.GALPAO, UserRole.ADMIN) // APENAS Galpão e Admin podem cadastrar novos materiais
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.materialsService.createMaterial(dto);
  }

  @Get()
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN) // Todos podem VER o catálogo
  findAllMaterials() {
    return this.materialsService.findAllMaterials();
  }

  @Get(':id')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN)
  findOneMaterial(@Param('id') id: string) {
    return this.materialsService.findOneMaterial(id);
  }

  @Patch(':id')
  @Roles(UserRole.GALPAO, UserRole.ADMIN) // Apenas Galpão e Admin alteram nomes/categorias
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.updateMaterial(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GALPAO, UserRole.ADMIN)
  removeMaterial(@Param('id') id: string) {
    return this.materialsService.removeMaterial(id); // O Service lidará com o bloqueio se houver estoque
  }

  // ==========================================
  // 🏭 ENTRADA FÍSICA DE ESTOQUE
  // ==========================================

  // NOVO ENDPOINT: Rota dedicada para dar entrada no estoque físico de um material
  @Post(':id/stock')
  @Roles(UserRole.GALPAO, UserRole.ADMIN) // Estritamente logístico
  registerStock(@Param('id') materialId: string, @Body() dto: RegisterStockDto) {
    return this.materialsService.registerNewStock(materialId, dto);
  }

  // ==========================================
  // 🏗️ GESTÃO DE ESTRUTURAS (KITS)
  // ==========================================

  @Post('structure')
  @Roles(UserRole.GALPAO, UserRole.ADMIN)
  createStructure(@Body() dto: CreateStructureTemplateDto) {
    return this.materialsService.createStructureWithTemplate(dto);
  }

  @Get('structure')
  @Roles(UserRole.PRODUCAO, UserRole.GALPAO, UserRole.ADMIN) // Produção precisa ler as estruturas para criar a OS
  findAllStructures() {
    return this.materialsService.findAllStructures();
  }

  @Delete('structure/:id')
  @Roles(UserRole.GALPAO, UserRole.ADMIN)
  removeStructure(@Param('id') id: string) {
    return this.materialsService.removeStructure(id);
  }
}
