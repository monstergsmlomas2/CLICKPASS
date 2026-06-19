import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/** Variables de entorno requeridas en Fase 1. La app no arranca si falta alguna. */
class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  // Conexión directa (puerto 5432) que Prisma usa para migraciones en Supabase.
  @IsString()
  @IsOptional()
  DIRECT_URL?: string;

  // Redis pendiente (Fase 1 sin Supabase Redis). Si no se define, la app arranca igual
  // y la cache de tokens queda deshabilitada; la rotación se resuelve vía DB.
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL: string = '7d';

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  PORT: string = '3001';

  @IsString()
  @IsOptional()
  BACKEND_URL: string = 'http://localhost:3001';

  // MercadoPago: opcionales. Si faltan, el módulo de pagos corre en modo SIMULADO.
  @IsString()
  @IsOptional()
  MERCADOPAGO_ACCESS_TOKEN?: string;

  @IsString()
  @IsOptional()
  MERCADOPAGO_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  MERCADOPAGO_WEBHOOK_SECRET?: string;

  // Email (Resend) y reembolsos: opcionales. Sin RESEND_API_KEY → email simulado.
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  @IsOptional()
  REFUND_SLA_HOURS?: string;

  @IsString()
  @IsOptional()
  REFUND_BONUS_CAP?: string;

  // Liquidación al organizador (payout). Opcionales; si faltan se usan los defaults.
  // Días corridos después del evento antes de liquidar (ventana de retención/contracargos).
  @IsString()
  @IsOptional()
  ORGANIZER_PAYOUT_DELAY_DAYS?: string;

  // Período de onboarding sin comisión desde el alta del organizador.
  @IsString()
  @IsOptional()
  ORGANIZER_FREE_PERIOD_DAYS?: string;

  // Comisión al organizador pasado el período gratis (0.05 = 5%).
  @IsString()
  @IsOptional()
  ORGANIZER_COMMISSION_RATE?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuración de entorno inválida:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
