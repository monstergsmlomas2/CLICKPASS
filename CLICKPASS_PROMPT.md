# PROYECTO: CLICKPASS — Plataforma de venta de entradas para eventos
> **Versión revisada (v2).** Incorpora correcciones de arquitectura, legales y de seguridad. Los cambios respecto a la v1 están marcados con 🔧 y explicados en la Sección 0.

## 0. CAMBIOS CLAVE RESPECTO A LA v1 (leer primero)
1. 🔧 **Arquitectura de arranque: monolito modular**, no 6 microservicios desde el día 1. Se conservan los 6 dominios como **módulos** dentro de una sola app NestJS. La extracción a microservicios es una fase posterior, opcional, cuando un módulo lo justifique (carga, equipo, despliegue independiente).
2. 🔧 **Migración desde Passline por importación de CSV**, NO por scraping con credenciales. Se elimina por completo el pedido de usuario/contraseña de Passline y el uso de Puppeteer para login. Motivo: riesgo legal (ToS/acceso indebido), pasivo de seguridad (credenciales de terceros) y contradicción con la marca de confianza.
3. 🔧 **Se eliminan los "testimonios simulados".** Solo testimonios reales (programa beta / early access). Testimonios falsos = publicidad engañosa.
4. 🔧 **Dinero con `Decimal`, no `Float`**, desde el día 1 (Prisma `Decimal`, columnas `numeric`).
5. 🔧 **Garantía "48h o el doble" redefinida** con reglas que limitan la exposición económica: el plazo cuenta en **horas hábiles desde la solicitud del organizador**, hay un **tope (cap)** de bonificación, y se **excluyen** demoras causadas por la red de pagos (Stripe/banco/disputas).
6. 🔧 **Compliance del país de lanzamiento** tratado como trabajo explícito (facturación electrónica, retenciones), no como detalle.

---

## 1. VISIÓN GENERAL
Clickpass es una plataforma SaaS que permite a organizadores crear eventos y vender entradas, y a usuarios comprar pases digitales. Diferenciador clave: **reembolsos rápidos garantizados** y experiencia "sin fricción". Competimos contra Passline, Eventbrite y Entradium. **Clickpass no es un clon de Passline, es su antítesis**: donde Passline genera desconfianza, Clickpass construye garantía; donde Passline tiene quejas, Clickpass genera fidelización.

## 2. PILARES DE MARCA (NO NEGOCIABLES)
- **Eslogan principal**: "Click. Pass. Listo."
- **Eslogan secundario**: "La entrada que nunca se pierde"
- **Promesa al usuario**: Si el evento se cancela, devolvemos el 100% en 48 horas hábiles desde la solicitud del organizador. Si nos pasamos (por causas atribuibles a Clickpass), aplicamos un bono compensatorio (ver Sección 6.2 y 10.1, con sus límites).
- **Tonos**: Cercano, ágil, confiable. Nada de lenguaje corporativo frío.
- **Valores**: Transparencia radical, velocidad, humanidad en el servicio al cliente.
- 🔧 **Coherencia marca↔producto**: ninguna feature puede pedir credenciales de otra plataforma ni usar testimonios falsos. La confianza es el producto.

## 3. STACK TECNOLÓGICO (Obligatorio)
- **Backend**: Node.js v20+ con TypeScript, framework NestJS (estructura modular; lista para extraer a microservicios más adelante).
- **Frontend**: Next.js 14 con App Router, Tailwind CSS, shadcn/ui.
- **Base de datos**: PostgreSQL 16 (principal), Redis 7 (caché, sesiones y rate limiting).
- **Mensajería**: RabbitMQ para eventos de dominio asíncronos (`TicketPurchased`, `RefundRequested`, `EventCancelled`). 🔧 En el monolito se usa un **EventBus interno** (eventos de NestJS) con la **misma forma de payload** que RabbitMQ, para poder migrar a colas sin reescribir la lógica.
- **Autenticación**: JWT (access + refresh tokens), bcrypt para hashing, sesiones/refresh en Redis.
- **Pagos**: Stripe Connect (split de pagos entre Clickpass y organizadores).
- **ORM**: Prisma (migraciones, tipado fuerte, `Decimal` para dinero).
- **Testing**: Jest + Supertest (unit/integración), Playwright (E2E).
- **Infra**: Docker + docker-compose para desarrollo, CI/CD con GitHub Actions.

## 4. ARQUITECTURA (Diseño dirigido por dominio)
🔧 **Arranque = monolito modular.** Una sola aplicación NestJS con 6 **módulos** de dominio, cada uno con su propio **schema** de PostgreSQL (aislamiento lógico desde el día 1, sin el costo operativo de 6 despliegues).

| Módulo | Responsabilidad | DB Schema |
|--------|-----------------|-----------|
| **auth** | Registro/login/roles/JWT/refresh | auth |
| **event** | CRUD de eventos, fechas, capacidades, categorías | event |
| **ticket** | Compra, reserva temporal, generación de QR, historial | ticket |
| **payment** | Stripe, webhooks, idempotencia | payment |
| **refund** | Reembolsos, cola de 48h, auditoría | refund |
| **notification** | Emails (Resend), SMS, push | notification |

**Comunicación interna (monolito)**: llamadas directas entre servicios de NestJS para consultas; **EventBus interno** para eventos de dominio (comandos asíncronos).

🔧 **Regla de límites de dominio**: aunque sea un monolito, los módulos NO comparten tablas entre sí. Las referencias entre dominios son por **ID externo** (ej: `organizerId`, `userId`), nunca por foreign key cruzando schemas. Esto mantiene la puerta abierta a extraer microservicios sin refactor.

### 4.1 Camino a microservicios (fase futura, opcional)
Cuando un módulo lo justifique (escala, equipo dedicado, despliegue independiente):
- Se reemplaza el EventBus interno por RabbitMQ (mismo contrato de payload → cambio localizado).
- Se expone el módulo como servicio propio con su `/health` y su DB.
- Se agregan circuit breakers (`@nestjs/microservices`) en los puntos de comunicación remota.
**No** se hace esto antes de tener tracción/uso real.

## 5. MODELO DE DATOS (Prisma — Definición mínima)
> 🔧 Todos los campos monetarios usan `Decimal` (`@db.Decimal(12,2)`), nunca `Float`.

```prisma
// ===== Schema: auth =====
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  firstName      String
  lastName       String
  role           Role     @default(USER) // ADMIN, ORGANIZER, USER
  organizationId String?
  phone          String?
  createdAt      DateTime @default(now())
  refreshTokens  RefreshToken[]
  passwordReset  PasswordReset?
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
}

model PasswordReset {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
}

// ===== Schema: event =====
model Event {
  id           String   @id @default(cuid())
  title        String
  description  String?
  category     String
  bannerUrl    String?
  organizerId  String   // ID externo (dominio auth)
  status       EventStatus @default(DRAFT) // DRAFT, PUBLISHED, CANCELLED, COMPLETED
  createdAt    DateTime @default(now())
  publishedAt  DateTime?
  dates        EventDate[]
  venueName    String?
  venueAddress String?
  city         String?
  country      String?
  latitude     Float?
  longitude    Float?
  refundPolicy RefundPolicy @default(STANDARD) // STANDARD, NO_REFUND, FLEXIBLE
  source       String?  // null = nativo; "PASSLINE_IMPORT" si vino de migración
}

enum RefundPolicy {
  STANDARD   // 48h garantizado ante cancelación
  NO_REFUND  // El organizador no acepta reembolsos voluntarios
  FLEXIBLE   // Reembolso voluntario hasta 24h antes del evento
}

model EventDate {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id])
  startDate   DateTime
  endDate     DateTime
  capacity    Int
  ticketsSold Int      @default(0) // desnormalizado para lectura rápida
  price       Decimal  @db.Decimal(12,2) // 🔧 Decimal, no Float
  currency    String   @default("USD")
  status      DateStatus @default(ACTIVE) // ACTIVE, SOLD_OUT, CANCELLED
  version     Int      @default(0) // Optimistic Concurrency Control
}

// ===== Schema: ticket =====
model Ticket {
  id            String   @id @default(cuid())
  eventDateId   String
  userId        String   // comprador (ID externo)
  purchaseId    String   // referencia al pago
  qrCode        String   @unique // hash SHA256(ticketId + salt)
  status        TicketStatus @default(RESERVED) // RESERVED, CONFIRMED, USED, REFUNDED
  reservedAt    DateTime @default(now())
  confirmedAt   DateTime?
  usedAt        DateTime?
  price         Decimal  @db.Decimal(12,2) // 🔧
  currency      String   @default("USD")
  attendeeName  String?
  attendeeEmail String?
  checkedInBy   String?
}

model ReservationLock {
  id             String   @id @default(cuid())
  eventDateId    String
  userId         String
  quantity       Int
  expiresAt      DateTime // TTL 5 min
  idempotencyKey String   @unique
}

model IdempotencyRecord {
  id        String   @id @default(cuid())
  key       String   @unique
  status    String   // PENDING, COMPLETED, FAILED
  response  Json?
  createdAt DateTime @default(now())
  expiresAt DateTime // TTL 24h
}

// ===== Schema: payment =====
model Payment {
  id                    String   @id @default(cuid())
  stripePaymentIntentId String   @unique
  userId                String
  amount                Decimal  @db.Decimal(12,2) // 🔧
  currency              String   @default("USD")
  status                PaymentStatus @default(PENDING) // PENDING, SUCCEEDED, FAILED, REFUNDED
  eventDateId           String
  ticketsCount          Int
  metadata              Json?
  createdAt             DateTime @default(now())
  completedAt           DateTime?
  refunds               Refund[]
}

model Refund {
  id             String   @id @default(cuid())
  paymentId      String
  payment        Payment  @relation(fields: [paymentId], references: [id])
  stripeRefundId String?  @unique
  amount         Decimal  @db.Decimal(12,2) // 🔧
  reason         String?  // EVENT_CANCELLED, USER_REQUEST, DUPLICATE
  status         RefundStatus @default(PROCESSING) // PROCESSING, COMPLETED, FAILED
  createdAt      DateTime @default(now())
  completedAt    DateTime?
  failureReason  String?
  attempts       Int      @default(0)
  // 🔧 Para la garantía 48h:
  requestedAt    DateTime @default(now()) // inicio del conteo (solicitud del organizador)
  slaDueAt       DateTime // requestedAt + 48h hábiles (precalculado)
  bonusApplied   Boolean  @default(false)
  bonusAmount    Decimal? @db.Decimal(12,2)
  bonusReason    String?  // null si no aplica; "SLA_BREACH_CLICKPASS"
}

// ===== Schema: refund =====
model RefundAudit {
  id          String   @id @default(cuid())
  eventId     String
  userId      String
  amount      Decimal  @db.Decimal(12,2) // 🔧
  status      String
  processedAt DateTime @default(now())
  completedAt DateTime?
  notifiedAt  DateTime? // email de seguimiento cada 12h
}

// ===== Schema: notification =====
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // EMAIL, SMS, PUSH
  channel   String   // TICKET_CONFIRMED, REFUND_STARTED, REFUND_COMPLETED, EVENT_REMINDER
  subject   String?
  content   String
  status    String   @default(PENDING) // PENDING, SENT, FAILED
  metadata  Json?
  createdAt DateTime @default(now())
  sentAt    DateTime?
}

// 🔧 Migración desde Passline POR CSV (no scraping)
model ImportLog {
  id           String   @id @default(cuid())
  organizerId  String
  source       String   // PASSLINE_CSV, EVENTBRITE_CSV, GENERIC_CSV
  fileName     String?
  status       String   // PENDING (parseado, sin confirmar), CONFIRMED, FAILED
  recordsTotal Int      @default(0)
  recordsValid Int      @default(0)
  recordsError Int      @default(0)
  preview      Json?    // filas válidas parseadas, para previsualización
  errors       Json?    // [{ line, field, message }]
  createdEventIds Json? // IDs creados al confirmar
  idempotencyKey  String @unique // evita doble confirmación
  createdAt    DateTime @default(now())
  confirmedAt  DateTime?
}
```

## 6. FLUJOS CRÍTICOS (Prioridad ALTA)

### 6.1 Compra de entrada (concurrencia)
1. Usuario solicita compra con `idempotencyKey` (UUID generado en frontend, enviado en header `Idempotency-Key`).
2. **Control de concurrencia (OCC)** con campo `version` en `EventDate`:
```sql
UPDATE "EventDate"
SET "ticketsSold" = "ticketsSold" + :quantity, "version" = "version" + 1
WHERE id = :id AND "version" = :currentVersion
  AND ("capacity" - "ticketsSold") >= :quantity;
```
   Si afecta 0 filas → rechazar (conflicto / sin cupo).
3. Crear `ReservationLock` con TTL 5 min mientras se procesa el pago.
4. Procesar pago vía módulo **payment** (Stripe).
5. Éxito → ticket `CONFIRMED`, eliminar lock, publicar `TicketPurchased` → **notification** envía email con QR.
6. Falla → liberar lock y devolver error.

### 6.2 🔧 Reembolso garantizado (Diferenciador clave) — versión acotada
1. Organizador cancela evento → `status = CANCELLED`.
2. **event** publica `EventCancelled`.
3. **refund** escucha y, por cada ticket `CONFIRMED`:
   - Crea `Refund` con `status = PROCESSING`, `requestedAt = ahora`, y `slaDueAt = requestedAt + 48h hábiles` (precalculado con calendario de días hábiles del país del evento).
   - Inicia reembolso vía Stripe.
   - Éxito → `COMPLETED`; falla → `FAILED` + reintento con **backoff exponencial (3 intentos)**.
4. **Compromiso**: completar todos los reembolsos dentro de 48h hábiles desde `requestedAt`.
5. 🔧 **Garantía "48h o bono" — con límites claros** (ver redacción legal en 10.1):
   - El bono **solo aplica si el incumplimiento es atribuible a Clickpass**, no a la red de pagos (Stripe/banco/disputa/chargeback/datos bancarios inválidos del usuario).
   - Bono = crédito (no efectivo) para futuras compras, con un **tope (cap)** configurable por transacción y por evento.
   - Se registra en `Refund.bonusApplied / bonusAmount / bonusReason = "SLA_BREACH_CLICKPASS"`.
   - **Provisión contable**: el sistema mantiene una métrica de exposición acumulada de bonos para alertar antes de que se vuelva un riesgo financiero.
6. Notificar al usuario por email cada 12h mientras está `PROCESSING`.
7. Publicar `RefundCompleted` para estadísticas.

### 6.3 Idempotencia
- Toda operación de compra acepta `idempotencyKey` y se guarda en `IdempotencyRecord` (`PENDING`/`COMPLETED`/`FAILED`).
- Misma key dos veces → devolver el resultado anterior sin re-ejecutar.
- 🔧 La **confirmación de importación** (Sección 9) usa el mismo patrón para evitar eventos duplicados.

## 7. SEGURIDAD
- **Rate limiting**: 100 req/min por IP en endpoints públicos (Redis).
- **CORS**: solo dominios autorizados.
- **Validación**: `class-validator` con DTOs en NestJS, en TODA entrada (incluido el parseo de CSV).
- **Sanitización**: escapar outputs en frontend (React lo hace por defecto).
- **JWT**: access 15 min, refresh 7 días con **rotación** en cada renovación.
- **Helmet**: headers de seguridad.
- **Auditoría**: loggear acciones sensibles de organizadores (cancelar evento, modificar precios, confirmar importación).
- 🔧 **Sin credenciales de terceros**: el sistema NUNCA solicita, almacena ni usa credenciales de otras plataformas. La importación es siempre por archivo aportado por el propio organizador.

## 8. SEO Y ESTRATEGIA DE CONTENIDO
### 8.1 Estructura SEO (Next.js)
- Meta tags dinámicos por evento: título, descripción, OG image, `schema.org` con markup `Event`.
- URLs amigables: `/events/nombre-del-evento-{id}`.
- `sitemap.xml` automático con eventos públicos.
- `robots.txt`: indexar eventos/landing/blog; no indexar dashboards/checkout/auth.
- SSR en páginas de eventos.

### 8.2 Palabras clave
- **Primarias**: "Comprar entradas [ciudad]", "Venta de entradas online", "Eventos [ciudad]".
- **Secundarias**: "Reembolso rápido de entradas", "Plataforma de entradas confiable", "Alternativa a Passline".
- **Long-tail**: "Cómo reclamar reembolso de evento cancelado", "Mejor plataforma para vender entradas".

### 8.3 Contenido (blog)
- "Qué hacer cuando cancelan un evento y no te devuelven el dinero".
- "Cómo elegir la mejor plataforma de venta de entradas".
- "Guía para organizadores: cómo maximizar tus ventas".
- "Reembolsos en plataformas de ticketing: qué dice la ley".

### 8.4 Backlinks
- Directorios de startups (Product Hunt, BetaList, StartupStash).
- Casos reales de organizadores migrados (con su permiso) para prensa/blogs del sector.
- Programa de afiliados para bloggers de eventos.

## 9. 🔧 MIGRACIÓN DESDE PASSLINE (por CSV — estrategia de captura)
> Reescrito por completo: **sin scraping, sin credenciales, sin Puppeteer.** El organizador aporta sus propios datos por archivo.

### 9.1 Herramienta de importación (wizard de 4 pasos)
Ruta: `/dashboard/organizer/import`.
1. **Plantilla**: el organizador descarga `plantilla-migracion-clickpass.csv` o sube su export de Passline/Eventbrite.
2. **Carga**: `POST /import/upload` (multipart). El backend parsea con `papaparse`/`csv-parse` y **valida fila por fila** con DTOs (`class-validator`): fechas válidas, `capacity > 0`, `price >= 0`, categoría válida, etc.
   - Crea `ImportLog` con `status = PENDING`, `recordsTotal/Valid/Error`, `preview` (filas válidas) y `errors` (`[{line, field, message}]`).
   - **No crea eventos todavía.**
3. **Previsualización**: `GET /import/:id/preview` → tabla verde (se creará) / roja (corregir y resubir).
4. **Confirmación**: `POST /import/:id/confirm` (con `idempotencyKey`) → crea `Event` + `EventDate` en `DRAFT` dentro de **una transacción** (`prisma.$transaction`). `ImportLog.status = CONFIRMED`, guarda `createdEventIds`. El organizador revisa y publica manualmente.

Formato CSV mínimo:
```
title,description,category,startDate,endDate,capacity,price,currency,venueName,city,country
```
(En v2: paso de **mapeo de columnas** para exports con nombres distintos. En v1: plantilla fija.)

### 9.2 Incentivos para migrar — "Passline Refugee Program"
- Primeros 3 meses sin comisión.
- Asistente personal de migración (chat con humano real).
- Sello "Verificado por Clickpass".
- Botón opcional en su página de evento: "¿Vienes de Passline? Cuéntanos tu experiencia" (recopila testimonios **reales**).

### 9.3 Comunicación de migración
Landing `/migrate-from-passline` con:
- Contador de organizadores que ya migraron (**dato real**).
- 🔧 Testimonios **reales** de beta/early access. **Prohibido** usar testimonios simulados o inventados (publicidad engañosa).
- Comparativa lado a lado Passline vs Clickpass (afirmaciones verificables).
- Formulario "Reservar mi lugar".

### 9.4 Viralización
Al migrar, se sugiere (opt-in, el organizador decide si publica) un post para LinkedIn/X:
> "Me cansé de Passline. Ahora uso Clickpass. Click. Pass. Listo."

## 10. TÉRMINOS LEGALES Y POLÍTICAS
### 10.1 Términos y Condiciones (cláusulas clave)
```
1. Responsabilidad de Clickpass:
   - Clickpass actúa como intermediario tecnológico.
   - No es responsable por la cancelación del evento por parte del organizador.
   - Se compromete a procesar reembolsos en 48 horas HÁBILES desde la SOLICITUD del organizador.

2. Política de reembolsos:
   - Si el organizador cancela: reembolso en 48h hábiles desde su solicitud.
   - Si el usuario solicita reembolso: según la política del organizador (STANDARD/NO_REFUND/FLEXIBLE).
   - Clickpass puede retener la comisión en reembolsos (para cubrir costos de la red de pagos).

3. Limitación de responsabilidad:
   - Clickpass no responde por daños indirectos, lucro cesante o interrupción del negocio.
   - Responsabilidad máxima: total de comisiones pagadas por el organizador en los últimos 12 meses.

4. 🔧 Garantía "48h o bono" (con límites):
   - Si Clickpass NO completa un reembolso en 48h hábiles POR CAUSAS ATRIBUIBLES A CLICKPASS,
     el usuario recibe un bono compensatorio.
   - NO aplica cuando la demora se origina en la red de pagos (Stripe/banco), en disputas,
     contracargos, o en datos bancarios incorrectos provistos por el usuario.
   - El bono es CRÉDITO para futuras compras (no efectivo), con un TOPE máximo por transacción
     y por evento, definido en la política vigente.
   - El bono lo paga Clickpass, no el organizador.
```

### 10.2 Política de Privacidad (GDPR/LGPD/Ley 19.628 de Chile)
- Consentimiento explícito (checkbox en registro).
- Derecho ARCO: `GET /user/data-export`.
- Derecho al olvido: `POST /user/delete` (elimina datos en 30 días).
- Transferencia internacional: aviso de procesamiento en AWS (EE.UU./Brasil/Europa).
- Cookies: banner con opción "solo necesarias".

### 10.3 Términos para Organizadores
```
- Responsable de la veracidad de la información del evento.
- Debe tener permisos para vender entradas del evento.
- En caso de cancelación, notificar a Clickpass con 48h de anticipación.
- Clickpass puede retener pagos ante actividad fraudulenta.
- Acepta que los usuarios dejen reseñas del evento.
- 🔧 Al importar datos (CSV), declara ser titular o estar autorizado a usar esa información.
```

### 10.4 Términos para Usuarios
```
- Entrada personal e intransferible (salvo que el organizador permita reventa).
- El QR debe presentarse en el evento; Clickpass no garantiza acceso si el QR fue compartido.
- El usuario acepta recibir comunicaciones operativas (recordatorios). Promociones son opt-in.
- Derecho de desistimiento: reembolso dentro de 14 días de la compra si el evento está a más
  de 30 días (aplica en UE y países de LATAM que lo reconozcan).
```

### 10.5 Auditoría legal
- Términos en 3 idiomas: Español, Inglés, Portugués.
- Aviso en footer: "Clickpass no es responsable por el contenido del evento".
- 🔧 Revisión por abogado local del país de lanzamiento antes de producción (facturación, consumidor, datos).

## 11. MODELO DE NEGOCIO Y PRECIOS
| Volumen de ventas | Comisión | Plan alternativo |
|---|---|---|
| < 100 entradas/mes | 3% + fee de pago | Sin plan mínimo |
| 100–500 entradas/mes | 2.5% + fee de pago | USD 29/mes (sin comisión) |
| > 500 entradas/mes | 2% + fee de pago | USD 49/mes (sin comisión) + soporte VIP |

Ingresos adicionales: publicidad destacada en home (USD 50/evento), comisión por reventa (marketplace secundario, 2%), API para integraciones (USD 99/mes).

## 12. FRONTEND (Next.js — Rutas mínimas)
| Ruta | Descripción | SEO |
|---|---|---|
| `/` | Landing con buscador, categorías, destacados | Indexable |
| `/events/[slug]-[id]` | Detalle, selector de fecha, comprar | Indexable, SSR |
| `/events/search` | Resultados con filtros | Indexable |
| `/checkout/[id]` | Pago (Stripe Elements) | No-index |
| `/dashboard/organizer` | Panel: crear/ver ventas/cancelar | No-index |
| `/dashboard/organizer/import` | 🔧 Wizard de importación CSV | No-index |
| `/dashboard/user` | Mis entradas (QR), solicitar reembolso | No-index |
| `/auth/login` · `/auth/register` | Auth | No-index |
| `/blog/[slug]` | Artículos SEO | Indexable |
| `/migrate-from-passline` | Landing de migración | Indexable |
| `/privacy` · `/terms` | Legales | Indexable |

Estado global: Zustand (carrito y sesión).

## 13. VARIABLES DE ENTORNO (Ejemplo)
```
# 🔧 Monolito: una DATABASE_URL; los schemas separan dominios
DATABASE_URL=postgresql://user:pass@localhost:5432/clickpass

REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672   # solo cuando se extraigan microservicios

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

JWT_SECRET=...
JWT_REFRESH_SECRET=...

RESEND_API_KEY=...                   # 🔧 email via Resend
SMTP_FROM=noreply@clickpass.app

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

SENTRY_DSN=...
```

## 14. 🔧 PRIMEROS HITOS (Orden de construcción — monolito modular)
**Fase 1: Fundación (Día 1–2)**
- Monorepo (Turborepo): `apps/backend` (NestJS monolito), `apps/frontend` (Next.js), `packages/shared` (tipos/DTOs).
- Docker con PostgreSQL + Redis.
- Módulo **auth**: `/auth/register`, `/auth/login`, `/auth/refresh` (JWT + refresh con rotación).
- Prisma con schemas por dominio y primeras migraciones.
- `/health`.

**Fase 2: Eventos y tickets (Día 3–4)**
- Módulo **event**: CRUD de eventos y fechas.
- Módulo **ticket**: reserva con OCC (`/tickets/reserve`) + `ReservationLock`.
- Test de concurrencia (100 compras simultáneas, 50 entradas → sin sobreventa).

**Fase 3: Pagos (Día 5–6)**
- Módulo **payment**: Stripe Connect, webhook de confirmación.
- Flujo completo compra → ticket confirmado.
- Idempotencia con `idempotencyKey`.

**Fase 4: Reembolsos y notificaciones (Día 7–8)**
- Módulo **refund**: lógica 48h hábiles + bono acotado (con cap y exclusiones).
- Módulo **notification**: email con QR (Resend).
- Dashboard básico usuario/organizador.

**Fase 5: SEO y migración (Día 9–10)**
- Meta tags + `schema.org`, `sitemap.xml`, `robots.txt`.
- 🔧 Wizard de **importación CSV** (upload → preview → confirm).
- Landing `/migrate-from-passline` + blog con 4 artículos.

**Fase 6: Seguridad y compliance (Día 11–12)**
- Rate limiting (Redis), CORS, Helmet.
- Endpoints ARCO (export/delete).
- Términos legales en 3 idiomas.
- 🔧 Compliance del país de lanzamiento (facturación electrónica, retenciones).

**Fase 7 (futura, opcional): Extracción a microservicios**
- Solo si hay tracción. EventBus interno → RabbitMQ, separar DBs, circuit breakers.

## 15. RESTRICCIONES TÉCNICAS
- No usar variables globales para conexiones DB/Redis → inyectar vía módulos.
- Todos los módulos/servicios exponen `/health`.
- Logging estructurado con **Pino** (JSON).
- Endpoints de pago: **POST** con `Idempotency-Key` en header.
- QR: `qrcode` + hash **SHA256(ticketId + salt)**.
- 🔧 Dinero siempre en `Decimal`; nunca operaciones monetarias con `Float`.
- 🔧 Módulos no comparten tablas; referencias entre dominios por ID externo.

## 16. PRUEBAS OBLIGATORIAS
- **auth**: registro con email duplicado, login fallido.
- **ticket**: concurrencia (100 compras / 50 entradas, sin sobreventa).
- **payment**: mock de Stripe (éxito y rechazo).
- **refund**: cancelación dispara reembolsos; bono se aplica solo cuando el incumplimiento es atribuible a Clickpass y respeta el cap.
- 🔧 **import**: CSV válido → preview correcta; CSV con errores → filas marcadas, sin crear eventos; doble confirm con misma `idempotencyKey` → sin duplicados.
- **E2E**: compra → confirmación → cancelación → reembolso.
- **SEO**: meta tags correctas en páginas de evento.

## 17. COMANDOS ÚTILES (package.json)
```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "test": "jest --coverage",
    "test:e2e": "playwright test",
    "test:concurrency": "ts-node scripts/concurrency-test.ts",
    "migrate": "prisma migrate dev",
    "seed": "ts-node scripts/seed.ts",
    "build": "turbo run build",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  }
}
```

## 18. MÉTRICAS Y ANALÍTICAS
- Tiempo promedio de reembolso (objetivo < 24h).
- Tasa de éxito de reembolsos (objetivo > 99%).
- 🔧 **Exposición acumulada de bonos por SLA** (alerta de riesgo financiero).
- Eventos creados/día; entradas por categoría; top 10 organizadores; conversión visita→compra; NPS post-compra.
- 🔧 Migraciones CSV completadas y tasa de error de importación.

## 19. DECISIONES YA TOMADAS (no re-debatir)
1. Comunicación interna: **HTTP / llamadas directas + EventBus** (monolito). gRPC/RabbitMQ solo en extracción futura.
2. Email: **Resend**.
3. Stripe en **modo test** para desarrollo.
4. DB **local** en desarrollo; RDS/cloud en producción.
5. País de lanzamiento prioritario: **Chile o Argentina** (más quejas de Passline) — definir uno para enfocar compliance.
6. 🔧 Migración: **CSV**, definitivamente (no scraping).

## INSTRUCCIÓN FINAL PARA CLAUDE CODE
Construir desde cero, empezando por la **Fase 1 (Fundación)** como **monolito modular NestJS**. Antes de escribir código, mostrar en **modo plan** los archivos a crear/modificar. No desviarse del stack. Si algo no está claro, preguntar antes de asumir. Al completar cada fase, pedir confirmación antes de avanzar. **Nunca** implementar scraping de credenciales ni testimonios falsos; la migración es siempre por CSV aportado por el organizador.
