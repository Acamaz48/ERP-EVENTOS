import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-materials.dto';
import { CreateStructureTemplateDto } from './dto/create-structure-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.materialsService.createMaterial(dto);
  }

  @Post('structure')
  createStructure(@Body() dto: CreateStructureTemplateDto) {
    return this.materialsService.createStructureWithTemplate(dto);
  }

  @Get()
  findAllMaterials() {
    return this.materialsService.findAllMaterials();
  }

  @Get('structure')
  findAllStructures() {
    return this.materialsService.findAllStructures();
  }
}