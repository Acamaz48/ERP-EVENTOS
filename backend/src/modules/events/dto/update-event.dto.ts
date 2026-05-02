export class UpdateEventDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  
  // Campos de endereço também opcionais
  latitude?: number;
  longitude?: number;
  street?: string;
  city?: string;
  state?: string;
}