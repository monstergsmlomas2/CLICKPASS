-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_event";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_ticket";

-- CreateEnum
CREATE TYPE "clickpass_event"."EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "clickpass_event"."RefundPolicy" AS ENUM ('STANDARD', 'NO_REFUND', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "clickpass_event"."DateStatus" AS ENUM ('ACTIVE', 'SOLD_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "clickpass_ticket"."TicketStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'USED', 'REFUNDED');

-- CreateTable
CREATE TABLE "clickpass_event"."Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "organizerId" TEXT NOT NULL,
    "status" "clickpass_event"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "venueName" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "refundPolicy" "clickpass_event"."RefundPolicy" NOT NULL DEFAULT 'STANDARD',
    "source" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_event"."EventDate" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "clickpass_event"."DateStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_ticket"."Ticket" (
    "id" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "qrCode" TEXT NOT NULL,
    "status" "clickpass_ticket"."TicketStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attendeeName" TEXT,
    "attendeeEmail" TEXT,
    "checkedInBy" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_ticket"."ReservationLock" (
    "id" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_ticket"."IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "clickpass_event"."Event"("organizerId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "clickpass_event"."Event"("status");

-- CreateIndex
CREATE INDEX "EventDate_eventId_idx" ON "clickpass_event"."EventDate"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "clickpass_ticket"."Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_eventDateId_idx" ON "clickpass_ticket"."Ticket"("eventDateId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "clickpass_ticket"."Ticket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationLock_idempotencyKey_key" ON "clickpass_ticket"."ReservationLock"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReservationLock_eventDateId_idx" ON "clickpass_ticket"."ReservationLock"("eventDateId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "clickpass_ticket"."IdempotencyRecord"("key");

-- AddForeignKey
ALTER TABLE "clickpass_event"."EventDate" ADD CONSTRAINT "EventDate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "clickpass_event"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
