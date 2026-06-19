-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_notification";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clickpass_refund";

-- CreateEnum
CREATE TYPE "clickpass_refund"."RefundStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "clickpass_refund"."Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mpRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "reason" TEXT,
    "status" "clickpass_refund"."RefundStatus" NOT NULL DEFAULT 'PROCESSING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "bonusApplied" BOOLEAN NOT NULL DEFAULT false,
    "bonusAmount" DECIMAL(12,2),
    "bonusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_refund"."RefundAudit" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "RefundAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clickpass_notification"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Refund_mpRefundId_key" ON "clickpass_refund"."Refund"("mpRefundId");

-- CreateIndex
CREATE INDEX "Refund_userId_idx" ON "clickpass_refund"."Refund"("userId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "clickpass_refund"."Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_eventId_idx" ON "clickpass_refund"."Refund"("eventId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "clickpass_notification"."Notification"("userId");
