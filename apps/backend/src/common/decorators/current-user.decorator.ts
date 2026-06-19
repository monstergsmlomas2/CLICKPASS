import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtAccessPayload } from '@clickpass/shared';

/** Inyecta el payload del usuario autenticado (puesto por JwtStrategy en request.user). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtAccessPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
