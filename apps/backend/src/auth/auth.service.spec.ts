import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';

/** Unit tests con dependencias mockeadas (Sección 16: email duplicado, login fallido). */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    ticket: { updateMany: jest.Mock };
    payment: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      // linkGuestPurchases: adopción de compras de invitado al registrarse.
      ticket: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn().mockResolvedValue([{ count: 0 }, { count: 0 }]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (k: string) => `secret-${k}`,
            get: (_k: string, d?: string) => d,
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  const baseUser = {
    id: 'u1',
    email: 'a@b.com',
    passwordHash: '',
    firstName: 'A',
    lastName: 'B',
    role: 'USER',
    phone: null,
    organizationId: null,
    createdAt: new Date(),
  };

  it('registra un usuario nuevo y devuelve tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(baseUser);
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await service.register({
      email: 'a@b.com',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
      phone: '+5491112345678',
    });

    expect(res.accessToken).toBeDefined();
    expect(res.refreshToken).toBeDefined();
    expect(res.user.email).toBe('a@b.com');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rechaza registro con email duplicado (409)', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        phone: '+5491112345678',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza login con credenciales inválidas (401)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      passwordHash: await bcrypt.hash('otra-clave', 10),
    });
    await expect(
      service.login({ email: 'a@b.com', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('hace login correcto con credenciales válidas', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      passwordHash: await bcrypt.hash('correcta1', 10),
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await service.login({ email: 'a@b.com', password: 'correcta1' });
    expect(res.accessToken).toBeDefined();
    expect(res.user.id).toBe('u1');
  });
});
