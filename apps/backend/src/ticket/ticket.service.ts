import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID, createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { ReserveTicketDto } from './dto/reserve-ticket.dto';
import { DomainEvents, TicketLinkRequestedPayload } from '../common/events/domain-events';
import { Prisma } from '@prisma/client';
import { JwtAccessPayload, Role } from '@clickpass/shared';

const RESERVATION_TTL_MIN = 5;

/** Vigencia del link mágico para ver las entradas de un invitado. */
const GUEST_TICKETS_TOKEN_TTL = '30m';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly emitter: EventEmitter2,
  ) {}

  /**
   * Reserva temporal de entradas con control de concurrencia optimista (OCC).
   * La no-sobreventa la garantiza el UPDATE atómico con guard de cupo + versión.
   * Idempotente vía `Idempotency-Key`. Acepta comprador logueado (actor) o
   * invitado sin cuenta (dto.guestEmail/guestName).
   */
  async reserve(
    actor: JwtAccessPayload | null,
    idempotencyKey: string,
    dto: ReserveTicketDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Falta el header Idempotency-Key');
    }
    if (!actor && (!dto.guestEmail || !dto.guestName)) {
      throw new BadRequestException('Para comprar sin cuenta indicá nombre y email de contacto');
    }
    const identity = {
      userId: actor?.sub ?? null,
      guestName: actor ? null : dto.guestName!,
      guestEmail: actor ? null : dto.guestEmail!,
      guestPhone: actor ? null : (dto.guestPhone ?? null),
    };

    // 1) Idempotencia: si ya existe un resultado, devolverlo sin re-ejecutar.
    const prior = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });
    if (prior) {
      if (prior.status === 'COMPLETED') return prior.response;
      if (prior.status === 'PENDING') {
        throw new ConflictException('La reserva con esta clave ya está en proceso');
      }
      throw new ConflictException('La reserva con esta clave falló previamente');
    }

    // Reservar la clave (PENDING). Si dos requests compiten, el unique evita duplicar.
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('La reserva con esta clave ya está en proceso');
      }
      throw e;
    }

    try {
      const result = await this.runReservation(identity, idempotencyKey, dto);
      await this.prisma.idempotencyRecord.update({
        where: { key: idempotencyKey },
        data: { status: 'COMPLETED', response: result as unknown as Prisma.InputJsonValue },
      });
      return result;
    } catch (err) {
      await this.prisma.idempotencyRecord.update({
        where: { key: idempotencyKey },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  private async runReservation(
    identity: { userId: string | null; guestName: string | null; guestEmail: string | null; guestPhone: string | null },
    idempotencyKey: string,
    dto: ReserveTicketDto,
  ) {
    const { eventDateId, quantity } = dto;

    // Pre-chequeo barato para distinguir 404 / fecha inactiva de "sin cupo".
    // No afecta la concurrencia: la garantía real la da el UPDATE atómico de abajo.
    const eventDate = await this.prisma.eventDate.findUnique({ where: { id: eventDateId } });
    if (!eventDate) throw new NotFoundException('Fecha de evento no encontrada');
    if (eventDate.status !== 'ACTIVE') {
      throw new ConflictException('Esta fecha no está disponible para la venta');
    }

    // Paso 1 — Incremento atómico del cupo (autocommit, statement único).
    // Postgres serializa el lock de fila: cada reserva incrementa solo si queda cupo.
    // Garantiza NO sobreventa sin reintentos. Al ser autocommit, libera la conexión de
    // inmediato (sin transacción interactiva), evitando saturar el pool bajo alta concurrencia.
    const rows = await this.prisma.$queryRaw<{ ticketsSold: number; capacity: number }[]>`
      UPDATE "clickpass_event"."EventDate"
      SET "ticketsSold" = "ticketsSold" + ${quantity},
          "version" = "version" + 1
      WHERE "id" = ${eventDateId}
        AND "status" = 'ACTIVE'::"clickpass_event"."DateStatus"
        AND ("capacity" - "ticketsSold") >= ${quantity}
      RETURNING "ticketsSold", "capacity"`;

    if (rows.length === 0) {
      // Pasó el pre-chequeo pero el UPDATE no prosperó: otra reserva consumió el cupo.
      throw new ConflictException('No hay cupo suficiente');
    }

    // Paso 1b — Consumiciones elegidas (opcional): descuento atómico de stock por
    // producto. Si alguno no tiene stock suficiente, se libera el cupo de entradas
    // recién tomado (compensación) y se aborta toda la reserva.
    let itemsSnapshot: { productId: string; name: string; unitPrice: string; quantity: number }[] = [];
    if (dto.items && dto.items.length > 0) {
      try {
        itemsSnapshot = await this.reserveProducts(eventDate.eventId, dto.items);
      } catch (err) {
        await this.releaseDateCapacity(eventDateId, quantity);
        throw err;
      }
    }

    const { ticketsSold, capacity } = rows[0];
    const tickets = Array.from({ length: quantity }, () => {
      const id = randomUUID();
      return {
        id,
        eventDateId,
        userId: identity.userId,
        attendeeName: identity.guestName,
        attendeeEmail: identity.guestEmail,
        attendeePhone: identity.guestPhone,
        qrCode: this.buildQr(id),
        price: eventDate.price,
        currency: eventDate.currency,
      };
    });

    // Paso 2 — Crear tickets + lock (y marcar SOLD_OUT) en un batch transaccional corto.
    // Si esto fallara tras el paso 1, el cupo quedaría tomado sin tickets; el ReservationLock
    // expira a los 5 min y la conciliación de cupo se reforzará en Fase 3 (pagos).
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.ticket.createMany({ data: tickets }),
      this.prisma.reservationLock.create({
        data: {
          eventDateId,
          userId: identity.userId,
          guestEmail: identity.guestEmail,
          quantity,
          items: itemsSnapshot.length > 0 ? (itemsSnapshot as unknown as Prisma.InputJsonValue) : undefined,
          idempotencyKey,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MIN * 60 * 1000),
        },
      }),
    ];
    if (ticketsSold >= capacity) {
      ops.push(
        this.prisma.eventDate.update({
          where: { id: eventDateId },
          data: { status: 'SOLD_OUT' },
        }),
      );
    }
    await this.prisma.$transaction(ops);

    return {
      status: 'RESERVED',
      eventDateId,
      quantity,
      items: itemsSnapshot,
      expiresInMinutes: RESERVATION_TTL_MIN,
      ticketIds: tickets.map((t) => t.id),
    };
  }

  /**
   * Descuenta stock de cada combo elegido con el mismo patrón de UPDATE atómico
   * que el cupo de entradas (sin sobreventa). Todos los productos deben pertenecer
   * al mismo evento que la función reservada y estar activos.
   */
  private async reserveProducts(eventId: string, items: { productId: string; quantity: number }[]) {
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const snapshot: { productId: string; name: string; unitPrice: string; quantity: number }[] = [];
    const applied: { productId: string; quantity: number }[] = [];
    try {
      for (const item of items) {
        const product = byId.get(item.productId);
        if (!product || product.eventId !== eventId || !product.active) {
          throw new NotFoundException('Uno de los combos elegidos no está disponible');
        }
        const rows = await this.prisma.$queryRaw<{ sold: number }[]>`
          UPDATE "clickpass_event"."Product"
          SET "sold" = "sold" + ${item.quantity},
              "version" = "version" + 1
          WHERE "id" = ${item.productId}
            AND "active" = true
            AND ("stock" IS NULL OR ("stock" - "sold") >= ${item.quantity})
          RETURNING "sold"`;
        if (rows.length === 0) {
          throw new ConflictException(`No hay stock suficiente de "${product.name}"`);
        }
        applied.push(item);
        snapshot.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.price.toString(),
          quantity: item.quantity,
        });
      }
      return snapshot;
    } catch (err) {
      // Compensar lo que sí se llegó a descontar antes de fallar.
      for (const item of applied) {
        await this.releaseProductStock(item.productId, item.quantity);
      }
      throw err;
    }
  }

  private async releaseDateCapacity(eventDateId: string, quantity: number) {
    await this.prisma.$executeRaw`
      UPDATE "clickpass_event"."EventDate"
      SET "ticketsSold" = GREATEST("ticketsSold" - ${quantity}, 0),
          "status" = 'ACTIVE'::"clickpass_event"."DateStatus",
          "version" = "version" + 1
      WHERE "id" = ${eventDateId}`;
  }

  private async releaseProductStock(productId: string, quantity: number) {
    await this.prisma.$executeRaw`
      UPDATE "clickpass_event"."Product"
      SET "sold" = GREATEST("sold" - ${quantity}, 0),
          "version" = "version" + 1
      WHERE "id" = ${productId}`;
  }

  private buildQr(ticketId: string): string {
    const salt = this.config.get<string>('TICKET_QR_SALT', 'clickpass-dev-salt');
    return createHash('sha256').update(`${ticketId}${salt}`).digest('hex');
  }

  /** Lista las entradas de un usuario (para el dashboard). */
  async findByUser(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { reservedAt: 'desc' },
    });
  }

  /**
   * Paso 1 (comprador SIN cuenta): pide un link mágico para ver sus entradas.
   * Si hay entradas de invitado para ese email, se envía a esa casilla un link con
   * token firmado (vence en 30 min). La respuesta es SIEMPRE genérica: no revela si
   * el email tiene compras. Como el link llega al correo, solo su dueño puede verlas.
   */
  async requestGuestTicketsLink(email: string) {
    const generic = {
      ok: true,
      message:
        'Si encontramos entradas asociadas a ese email, te enviamos un link para verlas.',
    };

    const normalized = email.trim().toLowerCase();
    const count = await this.prisma.ticket.count({
      where: {
        userId: null,
        attendeeEmail: { equals: normalized, mode: 'insensitive' },
        status: { in: ['CONFIRMED', 'USED', 'REFUNDED'] },
      },
    });
    if (count === 0) return generic;

    const token = await this.jwt.signAsync(
      { sub: normalized, purpose: 'guest_tickets' },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: GUEST_TICKETS_TOKEN_TTL,
      },
    );

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const evt: TicketLinkRequestedPayload = {
      email: normalized,
      viewUrl: `${frontendUrl}/tickets/view?token=${encodeURIComponent(token)}`,
      ticketCount: count,
    };
    this.emitter.emit(DomainEvents.TICKET_LINK_REQUESTED, evt);
    this.logger.log(`Link de entradas enviado a un invitado (${count} entradas)`);

    return generic;
  }

  /**
   * Paso 2 (comprador SIN cuenta): canjea el token del email y devuelve sus entradas,
   * enriquecidas con el título y la fecha del evento para mostrarlas en la web.
   */
  async viewGuestTickets(token: string) {
    let email: string;
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; purpose: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (claims.purpose !== 'guest_tickets') throw new Error('purpose inválido');
      email = claims.sub;
    } catch {
      throw new UnauthorizedException('El link es inválido o expiró. Pedí uno nuevo.');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        userId: null,
        attendeeEmail: { equals: email, mode: 'insensitive' },
        status: { in: ['CONFIRMED', 'USED', 'REFUNDED'] },
      },
      orderBy: { reservedAt: 'desc' },
    });

    // Enriquecer con título + fecha del evento (join manual entre schemas).
    const dateIds = [...new Set(tickets.map((t) => t.eventDateId))];
    const dates = await this.prisma.eventDate.findMany({ where: { id: { in: dateIds } } });
    const dateById = new Map(dates.map((d) => [d.id, d]));
    const eventIds = [...new Set(dates.map((d) => d.eventId))];
    const events = await this.prisma.event.findMany({ where: { id: { in: eventIds } } });
    const eventById = new Map(events.map((e) => [e.id, e]));

    return {
      email,
      tickets: tickets.map((t) => {
        const date = dateById.get(t.eventDateId);
        const event = date ? eventById.get(date.eventId) : undefined;
        return {
          id: t.id,
          qrCode: t.qrCode,
          status: t.status,
          price: t.price.toString(),
          currency: t.currency,
          purchaseId: t.purchaseId,
          eventTitle: event?.title ?? 'Evento',
          eventStartDate: date?.startDate ?? null,
        };
      }),
    };
  }

  /**
   * Valida una entrada en la puerta (organizador/admin). Marca USED de forma
   * idempotente: si ya estaba usada, informa cuándo, no rompe.
   */
  async checkIn(actor: JwtAccessPayload, qrCode: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { qrCode } });
    if (!ticket) throw new NotFoundException('Entrada no encontrada');

    const eventDate = await this.prisma.eventDate.findUnique({
      where: { id: ticket.eventDateId },
    });
    if (!eventDate) throw new NotFoundException('Función no encontrada');

    const event = await this.prisma.event.findUnique({ where: { id: eventDate.eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (actor.role !== Role.ADMIN && event.organizerId !== actor.sub) {
      throw new ForbiddenException('Esta entrada no pertenece a uno de tus eventos');
    }

    if (ticket.status === 'USED') {
      throw new ConflictException(
        `Esta entrada ya fue usada el ${ticket.usedAt?.toLocaleString('es-AR') ?? ''}`,
      );
    }
    if (ticket.status !== 'CONFIRMED') {
      throw new BadRequestException(`Esta entrada no está confirmada (estado: ${ticket.status})`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'USED', usedAt: new Date(), checkedInBy: actor.sub },
    });

    let attendeeName = ticket.attendeeName;
    let attendeeEmail = ticket.attendeeEmail;
    if (ticket.userId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: ticket.userId } });
      if (buyer) {
        attendeeName = `${buyer.firstName} ${buyer.lastName}`;
        attendeeEmail = buyer.email;
      }
    }

    return {
      ok: true,
      ticketId: updated.id,
      eventTitle: event.title,
      usedAt: updated.usedAt,
      attendeeName,
      attendeeEmail,
    };
  }
}
