import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Registro liviano del comprador (cuenta opcional tras comprar como invitado).
 * Solo email + contraseña + nombre son obligatorios: el apellido y el teléfono son
 * opcionales para no agregar fricción. El rol siempre es USER (no se acepta por el body).
 */
export class RegisterBuyerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite de bcrypt
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
