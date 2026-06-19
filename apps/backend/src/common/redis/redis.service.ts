import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cliente Redis inyectable (sin variables globales — Restricción técnica 15).
 *
 * Redis es OPCIONAL en Fase 1: si no hay REDIS_URL definido, el servicio queda
 * deshabilitado (no conecta) y los métodos se vuelven no-op. La app arranca igual.
 * Cuando se configure un Redis (ej. Upstash), todo empieza a funcionar sin cambios.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL no configurado: Redis deshabilitado (pendiente).');
      return;
    }
    this.client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  /** true si hay un Redis configurado y conectándose. */
  isEnabled(): boolean {
    return !!this.client;
  }

  getClient(): Redis | undefined {
    return this.client;
  }

  /** Devuelve true si responde PONG; false si está deshabilitado o no responde. */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    const res = await this.client.ping();
    return res === 'PONG';
  }

  /** Guarda un valor con TTL en segundos (no-op si Redis está deshabilitado). */
  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client?.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client ? this.client.get(key) : null;
  }

  async del(key: string): Promise<void> {
    await this.client?.del(key);
  }
}
