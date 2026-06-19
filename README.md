# Clickpass

> Click. Pass. Listo. — Plataforma de venta de entradas con reembolsos rápidos garantizados.

Monorepo (Turborepo) con un **monolito modular NestJS** (backend) y **Next.js 14** (frontend).
Ver el spec completo en [`CLICKPASS_PROMPT.md`](./CLICKPASS_PROMPT.md).

## Estado: Fase 1 — Fundación

Incluye: monorepo + tooling, Docker (Postgres 16 + Redis 7), Prisma con schemas por dominio
(empezando por `auth`), módulo **auth** (register / login / refresh con JWT + rotación) y `/health`.

## Requisitos
- Node.js 20+
- Docker + Docker Compose

## Puesta en marcha
```bash
cp .env.example .env          # completar secrets
docker compose up -d          # Postgres + Redis
npm install                   # workspaces
npm run migrate               # aplica schema "auth"
npm run dev                   # arranca backend (3001) y frontend (3000)
```

## Verificación rápida
- `GET  http://localhost:3001/health`
- `POST http://localhost:3001/auth/register`
- `POST http://localhost:3001/auth/login`
- `POST http://localhost:3001/auth/refresh`

## Tests
```bash
npm test            # unit + integración (Jest)
```

## Estructura
```
apps/backend     NestJS monolito (módulos: auth, health; event/ticket/... en fases siguientes)
apps/frontend    Next.js 14 (App Router)
packages/shared  DTOs y tipos compartidos
```
