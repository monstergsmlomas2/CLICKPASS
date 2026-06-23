import { IsISO8601, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/** Edición parcial de una función: reprogramar fecha, cambiar cupo o precio. */
export class UpdateEventDateDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}
