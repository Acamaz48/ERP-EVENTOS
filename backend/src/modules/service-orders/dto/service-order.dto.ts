// src/modules/service-orders/dto/service-order.dto.ts

import { 
  IsString, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsInt, 
  Min, 
  IsUUID, 
  ArrayMinSize 
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID('4', { message: 'O ID do material deve ser um UUID válido.' })
  materialId!: string;

  @IsUUID('4', { message: 'O ID da unidade operacional deve ser um UUID válido.' })
  operationalUnitId!: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima permitida é 1.' })
  quantity!: number;
}

export class CreateOrUpdateOrderDto {
  @IsUUID('4', { message: 'O ID do evento deve ser um UUID válido.' })
  eventId!: string;

  @IsString({ message: 'O fornecedor deve ser um texto.' })
  @IsOptional()
  supplier?: string;

  @IsArray({ message: 'Os itens devem ser enviados em formato de lista.' })
  @ArrayMinSize(1, { message: 'A ordem de serviço deve conter pelo menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}