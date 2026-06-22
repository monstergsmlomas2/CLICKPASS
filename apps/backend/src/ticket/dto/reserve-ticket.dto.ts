import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReserveItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}

export class ReserveTicketDto {
  @IsString()
  @IsNotEmpty()
  eventDateId: string;

  @IsInt()
  @Min(1)
  @Max(10) // tope por operación para evitar acaparamiento
  quantity: number;

  // Consumiciones (bebida/comida) elegidas junto con la entrada, opcional.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReserveItemDto)
  items?: ReserveItemDto[];

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
