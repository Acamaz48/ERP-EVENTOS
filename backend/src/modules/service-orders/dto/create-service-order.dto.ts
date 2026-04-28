export class CreateServiceOrderDto {
  eventId!: string;
  structureIds!: string[]; // IDs das estruturas (Tenda 10x10, Q30, etc)
  status?: string;         // Opcional (?) não precisa da exclamação
}