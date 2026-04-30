import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-materials.dto';
import { CreateStructureTemplateDto } from './dto/create-structure-template.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  // 1. Cria o Material e a Categoria (se não existir)
  async createMaterial(dto: CreateMaterialDto) {
    // Upsert: Atualiza se existir, Cria se não existir
    const category = await this.prisma.materialCategory.upsert({
      where: { name: dto.categoryName },
      update: {},
      create: { name: dto.categoryName },
    });

    try {
      return await this.prisma.material.create({
        data: {
          name: dto.name,
          categoryId: category.id,
          stock: dto.stock,
        },
      });
    } catch (error) {
      // Trata nosso @@unique([name, categoryId]) do schema
      throw new BadRequestException('Este material já existe nesta categoria.');
    }
  }

  // 2. Cria a Estrutura e já vincula o Gabarito de Materiais
  async createStructureWithTemplate(dto: CreateStructureTemplateDto) {
    const type = await this.prisma.structureType.upsert({
      where: { name: dto.typeName },
      update: {},
      create: { name: dto.typeName },
    });

    return this.prisma.structure.create({
      data: {
        name: dto.structureName,
        structureTypeId: type.id,
        // Cria os itens do gabarito de uma vez só!
        templates: {
          create: dto.items.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity
          }))
        }
      },
      include: { templates: true } // Retorna os itens criados para vermos
    });
  }

  // 3. Lista tudo para o nosso frontend depois
  async findAllMaterials() {
    return this.prisma.material.findMany({ include: { category: true } });
  }

  async findAllStructures() {
    return this.prisma.structure.findMany({ include: { type: true, templates: true } });
  }

  // --- NOVOS MÉTODOS DE CRUD ABAIXO ---

  async findOneMaterial(id: string) {
    return this.prisma.material.findUnique({ where: { id }, include: { category: true } });
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({
      where: { id },
      data: dto,
    });
  }

  async removeMaterial(id: string) {
    return this.prisma.material.delete({ where: { id } });
  }

  async removeStructure(id: string) {
    // Exclui primeiro o gabarito (dependência) e depois a estrutura
    return this.prisma.$transaction(async (tx) => {
      await tx.structureMaterialTemplate.deleteMany({ where: { structureId: id } });
      return tx.structure.delete({ where: { id } });
    });
  }
}