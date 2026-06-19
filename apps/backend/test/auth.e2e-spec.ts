import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * E2E del flujo auth. Requiere Postgres + Redis arriba (docker compose up) y `npm run migrate`.
 * Cubre: registro, email duplicado, login fallido, y rotación de refresh tokens (Sección 16).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e_${Date.now()}@clickpass.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  let refreshToken: string;

  it('POST /auth/register crea usuario y devuelve tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123', firstName: 'E2E', lastName: 'Test' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/register con email duplicado → 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123', firstName: 'E2E', lastName: 'Test' })
      .expect(409);
  });

  it('POST /auth/login con password incorrecta → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'incorrecta' })
      .expect(401);
  });

  it('POST /auth/login válido → 200 + tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /auth/refresh rota el token; reusar el viejo → 401', async () => {
    const ok = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(ok.body.refreshToken).toBeDefined();
    expect(ok.body.refreshToken).not.toBe(refreshToken);

    // Reusar el refresh ya consumido debe fallar (rotación / one-time use).
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('GET /health responde ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
