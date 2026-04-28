export class TemplateItemDto {
  materialId!: string;
  quantity!: number;
}

export class CreateStructureTemplateDto {
  structureName!: string; // Ex: "Tenda 10x10"
  typeName!: string;      // Ex: "Tenda"
  items!: TemplateItemDto[];
}