-- AlterTable
ALTER TABLE "clickpass_payment"."Payment" ADD COLUMN     "addOnsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "items" JSONB;

-- AlterTable
ALTER TABLE "clickpass_ticket"."ReservationLock" ADD COLUMN     "items" JSONB;

-- CreateTable
CREATE TABLE "clickpass_event"."Product" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "stock" INTEGER,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_eventId_idx" ON "clickpass_event"."Product"("eventId");

-- AddForeignKey
ALTER TABLE "clickpass_event"."Product" ADD CONSTRAINT "Product_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "clickpass_event"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
