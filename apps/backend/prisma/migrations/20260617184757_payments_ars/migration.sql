-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_payment";

-- CreateEnum
CREATE TYPE "clickpass_payment"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "clickpass_event"."EventDate" ALTER COLUMN "currency" SET DEFAULT 'ARS';

-- AlterTable
ALTER TABLE "clickpass_ticket"."Ticket" ALTER COLUMN "currency" SET DEFAULT 'ARS';

-- CreateTable
CREATE TABLE "clickpass_payment"."Payment" (
    "id" TEXT NOT NULL,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "userId" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "clickpass_payment"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "ticketsCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpPreferenceId_key" ON "clickpass_payment"."Payment"("mpPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "clickpass_payment"."Payment"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "clickpass_payment"."Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_eventDateId_idx" ON "clickpass_payment"."Payment"("eventDateId");
