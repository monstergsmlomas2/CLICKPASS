import { SetMetadata } from '@nestjs/common';
import { Role } from '@clickpass/shared';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados. Úsese junto con JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
