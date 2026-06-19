import { IsJWT, IsNotEmpty } from 'class-validator';
import type { RefreshInput } from '@clickpass/shared';

export class RefreshDto implements RefreshInput {
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}
