import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Igual que JwtAuthGuard pero no bloquea si no hay token (o es inválido):
 * deja request.user en null y la ruta decide si exige datos de invitado.
 * Permite que comprador-sin-cuenta y comprador-logueado usen el mismo endpoint.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user || null) as TUser;
  }
}
