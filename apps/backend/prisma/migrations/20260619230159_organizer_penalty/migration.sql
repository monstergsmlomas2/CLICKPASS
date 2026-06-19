-- CreateEnum
CREATE TYPE "clickpass_payout"."PenaltyStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateTable
CREATE TABLE "clickpass_payout"."OrganizerPenalty" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'EVENT_CANCELLATION',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "clickpass_payout"."PenaltyStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizerPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerPenalty_organizerId_idx" ON "clickpass_payout"."OrganizerPenalty"("organizerId");

-- CreateIndex
CREATE INDEX "OrganizerPenalty_status_idx" ON "clickpass_payout"."OrganizerPenalty"("status");
