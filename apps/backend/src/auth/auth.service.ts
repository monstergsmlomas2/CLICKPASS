import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponse,
  AuthTokens,
  JwtAccessPayload,
  PublicUser,
  Role,
} from '@clickpass/shared';
import type { User } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // Solo USER u ORGANIZER por registro público; cualquier otro valor cae a USER.
    const role = dto.role === Role.ORGANIZER ? Role.ORGANIZER : Role.USER;
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
      },
    });

    await this.linkGuestPurchases(user.id, user.email);
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  /**
   * Registro liviano del comprador (cuenta opcional post-compra). A diferencia de
   * `register` (pensado para organizadores), no exige apellido ni teléfono: el comprador
   * se sumó tras comprar como invitado y queremos mínima fricción. Siempre rol USER.
   * Al crear la cuenta, adopta las compras de invitado hechas con ese mismo email.
   */
  async registerBuyer(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado. Iniciá sesión.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName ?? '',
        phone: dto.phone,
        role: Role.USER,
      },
    });

    await this.linkGuestPurchases(user.id, user.email);
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  /**
   * Adopta las compras hechas como invitado con este email: vincula sus tickets y pagos
   * (userId null) a la cuenta recién creada para que aparezcan en su dashboard. Match
   * case-insensitive porque el email de invitado se guardó tal cual lo tipeó.
   *
   * Nota: el registro no verifica la titularidad del email todavía, así que esto confía
   * en que quien usa el email es su dueño (gap preexistente del sistema: falta verificación
   * de email). Aceptable para el MVP; pendiente de endurecer con verificación.
   */
  private async linkGuestPurchases(userId: string, email: string): Promise<void> {
    const match = { equals: email, mode: 'insensitive' as const };
    const [tickets, payments] = await this.prisma.$transaction([
      this.prisma.ticket.updateMany({
        where: { userId: null, attendeeEmail: match },
        data: { userId },
      }),
      this.prisma.payment.updateMany({
        where: { userId: null, guestEmail: match },
        data: { userId },
      }),
    ]);
    if (tickets.count > 0 || payments.count > 0) {
      this.logger.log(
        `Cuenta ${userId}: adoptadas ${tickets.count} entradas y ${payments.count} compras de invitado`,
      );
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Mensaje genérico para no revelar si el email existe.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  /**
   * Convierte una cuenta de comprador (USER) en organizadora. Autoservicio: no requiere
   * aprobación. Reemite tokens porque el rol viaja en el JWT y la sesión actual debe
   * tomar el cambio sin re-login. Idempotente si ya es ORGANIZER; ADMIN no se modifica.
   */
  async becomeOrganizer(userId: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const updated =
      user.role === Role.USER
        ? await this.prisma.user.update({
            where: { id: userId },
            data: { role: Role.ORGANIZER },
          })
        : user;

    const tokens = await this.issueTokens(updated);
    return { ...tokens, user: this.toPublicUser(updated) };
  }

  /** Rotación: valida el refresh, revoca el usado y emite un par nuevo. */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtAccessPayload & { type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Revocar el token usado (one-time use) antes de emitir el nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });

    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTtl,
      // jti único: garantiza que dos refresh emitidos en el mismo segundo (mismo payload/iat)
      // no produzcan el mismo JWT ni, por ende, el mismo hash (que viola el unique de token).
      jwtid: randomUUID(),
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.expiryFromTtl(refreshTtl);
    await this.prisma.refreshToken.create({
      data: { token: tokenHash, userId: user.id, expiresAt },
    });
    // TODO(Redis pendiente): cachear el hash en Redis para revocación rápida.
    // Por ahora la revocación/rotación se resuelve con la columna `revoked` de RefreshToken.

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Convierte un TTL tipo "7d" / "15m" / "3600s" a una fecha de expiración. */
  private expiryFromTtl(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 3600 * 1000);
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return new Date(now + value * multipliers[unit]);
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
    };
  }
}
