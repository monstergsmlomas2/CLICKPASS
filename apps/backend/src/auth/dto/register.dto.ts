import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Role, type RegisterInput } from '@clickpass/shared';

@ValidatorConstraint({ name: 'isWhatsAppPhone' })
class IsWhatsAppPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const digits = value.replace(/\D/g, '');
    // E.164 admite hasta 15 dígitos; 10 es el mínimo realista (código de área + número local).
    return digits.length >= 10 && digits.length <= 15;
  }

  defaultMessage(): string {
    return 'phone debe ser un número de WhatsApp válido, con código de área (10 a 15 dígitos)';
  }
}

export class RegisterDto implements RegisterInput {
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Validate(IsWhatsAppPhoneConstraint)
  phone: string;

  // Solo se admite USER u ORGANIZER por registro público; ADMIN nunca por esta vía.
  @IsOptional()
  @IsIn([Role.USER, Role.ORGANIZER])
  role?: typeof Role.USER | typeof Role.ORGANIZER;
}
