import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==========================================
// 📦 DTOs DE MATERIAIS BASE
// ==========================================

export class CreateMaterialDto {
  @IsString({ message: 'O nome do material deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome do material é obrigatório.' })
  name!: string;

  @IsString({ message: 'A categoria deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  categoryName!: string; // Ex: "Ferragens"

  @IsInt({ message: 'O estoque inicial deve ser um número inteiro.' })
  @Min(0, { message: 'O estoque não pode ser negativo.' })
  stock!: number;
}

export class UpdateMaterialDto {
  // @IsOptional() garante que o cliente pode enviar apenas o campo que deseja alterar (PATCH/PUT)
  @IsOptional()
  @IsString({ message: 'O nome do material deve ser um texto válido.' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'O estoque deve ser um número inteiro.' })
  @Min(0, { message: 'O estoque não pode ser negativo.' })
  stock?: number;
}

// ==========================================
// 🏗️ DTOs DE ESTRUTURAS (KITS/TEMPLATES)
// ==========================================

export class TemplateItemDto {
  @IsUUID('4', { message: 'O ID do material deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do material é obrigatório.' })
  materialId!: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima para compor um template é 1.' })
  quantity!: number;
}

export class CreateStructureTemplateDto {
  @IsString({ message: 'O nome da estrutura deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome da estrutura é obrigatório.' })
  structureName!: string; // Ex: "Tenda 10x10"

  @IsString({ message: 'O tipo da estrutura deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O tipo da estrutura é obrigatório.' })
  typeName!: string; // Ex: "Tenda"

  // @ValidateNested diz ao NestJS para entrar no array e validar cada TemplateItemDto individualmente
  @IsArray({ message: 'Os itens do template devem ser enviados em uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto) // Transforma o JSON bruto na instância da classe validável
  items!: TemplateItemDto[];
}

// ==========================================
// 🏭 DTO DE REGISTRO DE ESTOQUE (FÍSICO)
// ==========================================

export class RegisterStockDto {
  @IsUUID('4', { message: 'O ID da unidade operacional (Galpão) deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'A unidade operacional é obrigatória.' })
  operationalUnitId!: string;

  @IsInt({ message: 'A quantidade a ser registrada deve ser um número inteiro.' })
  @Min(1, { message: 'É necessário registrar pelo menos 1 item físico no galpão.' })
  quantity!: number;
}