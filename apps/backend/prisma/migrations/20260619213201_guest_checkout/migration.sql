-- AlterTable
ALTER TABLE "clickpass_notification"."Notification" ADD COLUMN     "recipientEmail" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clickpass_payment"."Payment" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clickpass_refund"."Refund" ADD COLUMN     "guestEmail" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clickpass_refund"."RefundAudit" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clickpass_ticket"."ReservationLock" ADD COLUMN     "guestEmail" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clickpass_ticket"."Ticket" ADD COLUMN     "attendeePhone" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Ticket_attendeeEmail_idx" ON "clickpass_ticket"."Ticket"("attendeeEmail");
