import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RefundPolicy } from '@prisma/client';

/** Actualización parcial de campos de cabecera del evento (no de sus fechas). */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(RefundPolicy)
  refundPolicy?: RefundPolicy;
}
