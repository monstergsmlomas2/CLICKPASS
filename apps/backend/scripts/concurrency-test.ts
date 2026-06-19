/**
 * Prueba de concurrencia (Sección 16 del spec):
 * 100 reservas simultáneas sobre una fecha con capacidad 50 → NUNCA debe haber sobreventa.
 *
 * Uso: npm run test:concurrency  (requiere .env con DATABASE_URL de Supabase apuntando
 * al session pooler 5432, que soporta transacciones interactivas).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EventService } from '../src/event/event.service';
import { TicketService } from '../src/ticket/ticket.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { randomUUID } from 'crypto';

const CAPACITY = 50;
const ATTEMPTS = 100;
const ORGANIZER = 'concurrency-test-organizer';
const BUYER = 'concurrency-test-user';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const events = app.get(EventService);
  const tickets = app.get(TicketService);
  const prisma = app.get(PrismaService);

  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();

  const event = await events.create(ORGANIZER, {
    title: 'Concurrency Test Event',
    category: 'test',
    dates: [{ startDate: start, endDate: end, capacity: CAPACITY, price: 10 }],
  });
  const eventDateId = event.dates[0].id;
  console.log(`Evento ${event.id} | fecha ${eventDateId} | capacidad ${CAPACITY}`);

  // Disparar ATTEMPTS reservas concurrentes de 1 entrada cada una.
  const results = await Promise.allSettled(
    Array.from({ length: ATTEMPTS }, () =>
      tickets.reserve(BUYER, randomUUID(), { eventDateId, quantity: 1 }),
    ),
  );

  const ok = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - ok;

  const finalDate = await prisma.eventDate.findUniqueOrThrow({ where: { id: eventDateId } });
  const ticketCount = await prisma.ticket.count({ where: { eventDateId } });

  console.log('\n===== RESULTADO =====');
  console.log(`Reservas exitosas : ${ok}`);
  console.log(`Reservas rechazadas: ${failed}`);
  console.log(`ticketsSold en DB  : ${finalDate.ticketsSold}`);
  console.log(`Tickets creados    : ${ticketCount}`);
  console.log(`Estado de la fecha : ${finalDate.status}`);

  const noOversell =
    finalDate.ticketsSold === CAPACITY && ticketCount === CAPACITY && ok === CAPACITY;

  // Limpieza
  await prisma.ticket.deleteMany({ where: { eventDateId } });
  await prisma.reservationLock.deleteMany({ where: { eventDateId } });
  await prisma.eventDate.deleteMany({ where: { eventId: event.id } });
  await prisma.event.delete({ where: { id: event.id } });
  await prisma.idempotencyRecord.deleteMany({
    where: { createdAt: { gte: new Date(Date.now() - 600000) } },
  });

  await app.close();

  if (noOversell) {
    console.log('\n✅ SIN SOBREVENTA — la prueba de concurrencia PASÓ.');
    process.exit(0);
  } else {
    console.error('\n❌ SOBREVENTA DETECTADA — la prueba FALLÓ.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
