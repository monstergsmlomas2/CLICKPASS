/**
 * Tipos y contratos compartidos entre backend y frontend.
 * Fase 1: solo dominio auth. Se irán agregando dominios en fases posteriores.
 */

/**
 * Roles del sistema. Se modela como objeto `const` (no `enum`) para que el paquete
 * compartido pueda consumirse como `.ts` fuente bajo el stripping de tipos de Node,
 * que no soporta `enum`. Sigue usándose igual: `Role.ADMIN` (valor) y `Role` (tipo).
 */
export const Role = {
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Payload que viaja dentro del access token JWT. */
export interface JwtAccessPayload {
  sub: string; // userId
  email: string;
  role: Role;
}

/** Respuesta estándar de autenticación (register / login / refresh). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}

/** Contratos de entrada (la validación con class-validator vive en el backend). */
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}
