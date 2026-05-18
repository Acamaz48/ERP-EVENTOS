import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PhysicalItemStatus } from '@prisma/client';

// CORREÇÃO: Consumindo o ficheiro unificado de DTOs
import { 
  CreateMaterialDto, 
  CreateStructureTemplateDto, 
  UpdateMaterialDto,
  RegisterStockDto 
} from './dto/material.dto';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 🏭 REGISTO DE ESTOQUE FÍSICO (Transacional)
  // ==========================================
  async registerNewStock(materialId: string, dto: RegisterStockDto) {
    const materialExists = await this.prisma.material.findUnique({ where: { id: materialId } });
    if (!materialExists) throw new NotFoundException('Material não encontrado no catálogo.');

    // CORREÇÃO CRÍTICA: Transação Atómica. O Prisma garante que ou todas as etapas funcionam, ou nenhuma é salva.
    return this.prisma.$transaction(async (tx) => {
      // 1. Cria os itens físicos individuais (serializados/etiquetáveis) no galpão
      const items = Array.from({ length: dto.quantity }).map(() => ({
        materialId,
        operationalUnitId: dto.operationalUnitId,
        status: PhysicalItemStatus.AVAILABLE,
      }));
      await tx.physicalItem.createMany({ data: items });

      // 2. Atualiza o contador de estoque agregado na tabela pai (Material)
      const updatedMaterial = await tx.material.update({
        where: { id: materialId },
        data: {
          stock: { increment: dto.quantity } // Incremento seguro contra condições de corrida (Race Conditions)
        }
      });

      // 3. Registra a movimentação para auditoria (Histórico de Inventário)
      await tx.inventoryMovement.create({
        data: {
          materialId,
          type: 'ENTRADA',
          quantity: dto.quantity
        }
      });

      return updatedMaterial;
    });
  }

  // ==========================================
  // 📦 GESTÃO DO CATÁLOGO DE MATERIAIS BASE
  // ==========================================
  
  async createMaterial(dto: CreateMaterialDto) {
    // Upsert: Atualiza se existir, Cria se não existir (evita duplicação de categorias)
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
      // Trata nosso constraint @@unique([name, categoryId]) do Prisma schema
      throw new BadRequestException('Este material já existe nesta categoria.');
    }
  }

  async findAllMaterials() {
    return this.prisma.material.findMany({ 
      include: { category: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOneMaterial(id: string) {
    const material = await this.prisma.material.findUnique({ 
      where: { id }, 
      include: { category: true } 
    });
    if (!material) throw new NotFoundException('Material não encontrado.');
    return material;
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({
      where: { id },
      data: dto,
    });
  }

  // CORREÇÃO CRÍTICA: Exclusão Segura
  async removeMaterial(id: string) {
    // 1. Verifica se o material existe e conta quantas amarras ele possui
    const material = await this.prisma.material.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { physicalItems: true, templates: true, orderItems: true }
        }
      }
    });

    if (!material) throw new NotFoundException('Material não encontrado.');

    // 2. Regra de Negócio: Impede a exclusão se houver dependências ativas
    if (material.stock > 0 || material._count.physicalItems > 0) {
      throw new BadRequestException('Acesso negado: Este material possui itens físicos em estoque.');
    }
    if (material._count.templates > 0) {
      throw new BadRequestException('Acesso negado: Este material faz parte da composição de uma ou mais Estruturas/Kits.');
    }
    if (material._count.orderItems > 0) {
      throw new BadRequestException('Acesso negado: Este material possui histórico em Ordens de Serviço.');
    }

    // 3. Se passou pelas regras, exclui o material com segurança
    return this.prisma.$transaction(async (tx) => {
      // Remove o histórico de movimento zerado para não deixar lixo, depois remove o material
      await tx.inventoryMovement.deleteMany({ where: { materialId: id } });
      return tx.material.delete({ where: { id } });
    });
  }

  // ==========================================
  // 🏗️ GESTÃO DE ESTRUTURAS (KITS DE MATERIAIS)
  // ==========================================
  
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
        // Cria os itens do gabarito numa operação em cascata
        templates: {
          create: dto.items.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity
          }))
        }
      },
      include: { templates: true } 
    });
  }

  async findAllStructures() {
    return this.prisma.structure.findMany({ 
      include: { 
        type: true, 
        templates: { include: { material: true } } // Retorna os nomes reais dos materiais do Kit
      },
      orderBy: { name: 'asc' }
    });
  }

  async removeStructure(id: string) {
    // Exclui primeiro o gabarito (tabela pivô) e depois a estrutura principal
    return this.prisma.$transaction(async (tx) => {
      await tx.structureMaterialTemplate.deleteMany({ where: { structureId: id } });
      return tx.structure.delete({ where: { id } });
    });
  }
}
