-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_payout";

-- CreateEnum
CREATE TYPE "clickpass_payout"."PayoutStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'PAID', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "clickpass_payout"."Payout" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "ticketsCount" INTEGER NOT NULL,
    "status" "clickpass_payout"."PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "mpTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_eventDateId_key" ON "clickpass_payout"."Payout"("eventDateId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_mpTransferId_key" ON "clickpass_payout"."Payout"("mpTransferId");

-- CreateIndex
CREATE INDEX "Payout_organizerId_idx" ON "clickpass_payout"."Payout"("organizerId");

-- CreateIndex
CREATE INDEX "Payout_eventId_idx" ON "clickpass_payout"."Payout"("eventId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "clickpass_payout"."Payout"("status");
