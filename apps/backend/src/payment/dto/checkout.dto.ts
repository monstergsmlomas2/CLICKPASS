import { IsInt, IsNotEmpty, IsString, IsOptional, IsEmail, Min } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  eventDateId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /** idempotencyKey usada al reservar (vincula el pago con los tickets RESERVED). */
  @IsString()
  @IsNotEmpty()
  reservationKey: string;

  // Mismos datos de contacto enviados en /tickets/reserve; obligatorios sin token de sesión.
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
