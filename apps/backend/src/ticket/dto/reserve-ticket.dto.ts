import { IsInt, IsString, IsNotEmpty, IsOptional, IsEmail, Max, Min } from 'class-validator';

export class ReserveTicketDto {
  @IsString()
  @IsNotEmpty()
  eventDateId: string;

  @IsInt()
  @Min(1)
  @Max(10) // tope por operación para evitar acaparamiento
  quantity: number;

  // Datos de contacto para comprar sin cuenta. Obligatorios solo si no hay token de sesión.
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}
