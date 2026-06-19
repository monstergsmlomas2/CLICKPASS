import { IsIn, IsString, IsNotEmpty } from 'class-validator';

/** Solo para desarrollo: emula la respuesta de MercadoPago. */
export class SimulateDto {
  @IsString()
  @IsNotEmpty()
  reference: string; // = id de nuestro Payment

  @IsIn(['approved', 'rejected', 'pending'])
  status: 'approved' | 'rejected' | 'pending';
}
