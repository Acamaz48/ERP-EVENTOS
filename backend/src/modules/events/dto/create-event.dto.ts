export class CreateEventDto {
  name!: string;
  startDate!: string;
  endDate!: string;
  status!: string;
  
  // Dados do Endereço
  latitude!: number;
  longitude!: number;
  street?: string;
  city?: string;
  state?: string;
}