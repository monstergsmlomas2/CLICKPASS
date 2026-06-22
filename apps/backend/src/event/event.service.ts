import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { DomainEvents, EventCancelledPayload } from '../common/events/domain-events';
import { CreateEventDto, CreateEventDateDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddEventDateDto } from './dto/add-event-date.dto';
import { ImportRow } from './dto/import-event.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Role } from '@clickpass/shared';
import { EventStatus, Prisma, RefundPolicy } from '@prisma/client';

const REFUND_POLICIES = new Set(['STANDARD', 'NO_REFUND', 'FLEXIBLE']);

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async create(organizerId: string, dto: CreateEventDto) {
    dto.dates.forEach((d) => this.assertValidRange(d));

    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        bannerUrl: dto.bannerUrl,
        coverUrl: dto.coverUrl,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        city: dto.city,
        country: dto.country,
        refundPolicy: dto.refundPolicy,
        organizerId,
        dates: {
          create: dto.dates.map((d) => ({
            startDate: new Date(d.startDate),
            endDate: new Date(d.endDate),
            capacity: d.capacity,
            price: new Prisma.Decimal(d.price),
            currency: d.currency ?? 'ARS',
          })),
        },
      },
      include: { dates: true },
    });
  }

  /** Eventos del organizador autenticado (cualquier estado), para su panel. */
  async findByOrganizer(organizerId: string) {
    return this.prisma.event.findMany({
      where: { organizerId },
      include: { dates: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Catálogo público: solo eventos publicados. */
  async findPublished(params: { category?: string; city?: string; skip?: number; take?: number }) {
    const take = Math.min(params.take ?? 20, 100);
    return this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        category: params.category,
        city: params.city,
      },
      include: { dates: { where: { status: 'ACTIVE' } } },
      orderBy: { publishedAt: 'desc' },
      skip: params.skip ?? 0,
      take,
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { dates: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async update(id: string, user: { sub: string; role: Role }, dto: UpdateEventDto) {
    const event = await this.requireOwned(id, user);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('No se puede modificar un evento cancelado');
    }
    return this.prisma.event.update({
      where: { id },
      data: dto,
      include: { dates: true },
    });
  }

  async addDate(id: string, user: { sub: string; role: Role }, dto: AddEventDateDto) {
    await this.requireOwned(id, user);
    this.assertValidRange(dto);
    return this.prisma.eventDate.create({
      data: {
        eventId: id,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'ARS',
      },
    });
  }

  async publish(id: string, user: { sub: string; role: Role }) {
    const event = await this.requireOwned(id, user);
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Solo se puede publicar un evento en borrador');
    }
    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED, publishedAt: new Date() },
      include: { dates: true },
    });
  }

  /**
   * Cancela el evento. En Fase 4 esto publicará `EventCancelled` para disparar
   * los reembolsos garantizados; por ahora solo cambia el estado.
   */
  async cancel(id: string, user: { sub: string; role: Role }) {
    const event = await this.requireOwned(id, user);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('El evento ya está cancelado');
    }
    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
      include: { dates: true },
    });

    // Disposición del organizador → dispara los reembolsos garantizados (módulo refund).
    const payload: EventCancelledPayload = {
      eventId: updated.id,
      eventTitle: updated.title,
      eventDateIds: updated.dates.map((d) => d.id),
    };
    this.emitter.emit(DomainEvents.EVENT_CANCELLED, payload);

    return updated;
  }

  /**
   * Parsea CSV simple (sin comillas/escapes) y valida fila por fila para previsualizar
   * antes de crear nada. Una fila = un evento con una única función.
   */
  previewImport(csv: string): ImportRow[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const colIndex = (name: string) => header.indexOf(name.toLowerCase());

    return lines.slice(1).map((line, i) => {
      const cells = line.split(',').map((c) => c.trim());
      const get = (name: string) => {
        const idx = colIndex(name);
        return idx >= 0 ? cells[idx] : '';
      };

      const errors: string[] = [];
      const title = get('title');
      const category = get('category');
      const startDateRaw = get('startDate');
      const endDateRaw = get('endDate');
      const capacityRaw = get('capacity');
      const priceRaw = get('price');
      const refundPolicyRaw = get('refundPolicy').toUpperCase() || 'STANDARD';

      if (!title) errors.push('Falta el título');
      if (!category) errors.push('Falta la categoría');

      const startDate = new Date(startDateRaw);
      const endDate = new Date(endDateRaw);
      if (!startDateRaw || isNaN(startDate.getTime())) errors.push('startDate inválida');
      if (!endDateRaw || isNaN(endDate.getTime())) errors.push('endDate inválida');
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate <= startDate) {
        errors.push('endDate debe ser posterior a startDate');
      }

      const capacity = Number(capacityRaw);
      if (!capacityRaw || !Number.isInteger(capacity) || capacity <= 0) {
        errors.push('capacity debe ser un entero mayor a 0');
      }

      const price = Number(priceRaw);
      if (priceRaw === '' || isNaN(price) || price < 0) {
        errors.push('price debe ser un número mayor o igual a 0');
      }

      if (!REFUND_POLICIES.has(refundPolicyRaw)) {
        errors.push(`refundPolicy inválida: ${refundPolicyRaw}`);
      }

      return {
        line: i + 2, // +1 por header, +1 por índice base 1
        valid: errors.length === 0,
        errors,
        title,
        category,
        city: get('city') || undefined,
        venueName: get('venueName') || undefined,
        country: get('country') || undefined,
        refundPolicy: refundPolicyRaw,
        startDate: startDateRaw,
        endDate: endDateRaw,
        capacity,
        price,
        currency: get('currency') || 'ARS',
      };
    });
  }

  /** Crea como DRAFT cada fila válida. Re-valida server-side (no confía en el cliente). */
  async confirmImport(organizerId: string, rows: ImportRow[]) {
    const validRows = rows.filter((r) => r.valid && r.title && r.category && r.startDate && r.endDate);
    const eventIds: string[] = [];

    for (const row of validRows) {
      const created = await this.prisma.event.create({
        data: {
          title: row.title!,
          category: row.category!,
          city: row.city,
          venueName: row.venueName,
          country: row.country,
          refundPolicy: (row.refundPolicy as RefundPolicy) ?? RefundPolicy.STANDARD,
          organizerId,
          source: 'PASSLINE_IMPORT',
          dates: {
            create: [
              {
                startDate: new Date(row.startDate!),
                endDate: new Date(row.endDate!),
                capacity: row.capacity!,
                price: new Prisma.Decimal(row.price!),
                currency: row.currency ?? 'ARS',
              },
            ],
          },
        },
      });
      eventIds.push(created.id);
    }

    return { created: eventIds.length, skipped: rows.length - validRows.length, eventIds };
  }

  /** Combos de bebida/comida activos del evento, para mostrar en el checkout del comprador. */
  async listActiveProducts(eventId: string) {
    return this.prisma.product.findMany({
      where: { eventId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Todos los combos del evento (incl. inactivos), para el panel del organizador. */
  async listAllProducts(eventId: string, user: { sub: string; role: Role }) {
    await this.requireOwned(eventId, user);
    return this.prisma.product.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addProduct(eventId: string, user: { sub: string; role: Role }, dto: CreateProductDto) {
    await this.requireOwned(eventId, user);
    return this.prisma.product.create({
      data: {
        eventId,
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'ARS',
        stock: dto.stock,
      },
    });
  }

  async updateProduct(
    eventId: string,
    productId: string,
    user: { sub: string; role: Role },
    dto: UpdateProductDto,
  ) {
    await this.requireOwned(eventId, user);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.eventId !== eventId) {
      throw new NotFoundException('Combo no encontrado');
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price != null ? new Prisma.Decimal(dto.price) : undefined,
        stock: dto.stock,
        active: dto.active,
      },
    });
  }

  /** Borra el combo solo si nunca se vendió; si ya tiene ventas, se desactiva para no romper pedidos pasados. */
  async deleteProduct(eventId: string, productId: string, user: { sub: string; role: Role }) {
    await this.requireOwned(eventId, user);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.eventId !== eventId) {
      throw new NotFoundException('Combo no encontrado');
    }
    if (product.sold > 0) {
      return this.prisma.product.update({ where: { id: productId }, data: { active: false } });
    }
    await this.prisma.product.delete({ where: { id: productId } });
    return { deleted: true };
  }

  private async requireOwned(id: string, user: { sub: string; role: Role }) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.organizerId !== user.sub && user.role !== Role.ADMIN) {
      throw new ForbiddenException('No sos el organizador de este evento');
    }
    return event;
  }

  private assertValidRange(d: CreateEventDateDto) {
    if (new Date(d.endDate).getTime() <= new Date(d.startDate).getTime()) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }
  }
}
