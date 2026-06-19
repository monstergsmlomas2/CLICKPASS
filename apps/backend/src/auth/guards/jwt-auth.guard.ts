import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege rutas exigiendo un access token válido en Authorization: Bearer. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
