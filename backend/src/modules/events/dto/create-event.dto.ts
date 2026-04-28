export class CreateEventDto {
  name!: string;
  latitude!: number;
  longitude!: number;
  startDate!: string; // Receberemos como string ISO (ex: "2026-05-10T10:00:00Z")
  endDate!: string;
  status!: string;    // PENDING, ACTIVE, FINISHED
}