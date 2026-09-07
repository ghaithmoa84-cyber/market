
-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('YALLA_SHARE', 'COURIER_EARNING', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED');

-- CreateTable
CREATE TABLE "FinancialLedger" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "referenceLedgerId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementBatch" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "totalDeliveryFees" DECIMAL(14,2) NOT NULL,
    "totalYallaShare" DECIMAL(14,2) NOT NULL,
    "totalCourierEarnings" DECIMAL(14,2) NOT NULL,
    "amountDue" DECIMAL(14,2) NOT NULL,
    "amountSettled" DECIMAL(14,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "settledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementItem" (
    "id" TEXT NOT NULL,
    "settlementBatchId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "yallaShare" DECIMAL(14,2) NOT NULL,
    "amountSettled" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLedger_idempotencyKey_key" ON "FinancialLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialLedger_orderId_createdAt_idx" ON "FinancialLedger"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialLedger_courierId_createdAt_idx" ON "FinancialLedger"("courierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementBatch_courierId_settlementDate_key" ON "SettlementBatch"("courierId", "settlementDate");

-- CreateIndex
CREATE INDEX "SettlementItem_orderId_idx" ON "SettlementItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementItem_settlementBatchId_orderId_key" ON "SettlementItem"("settlementBatchId", "orderId");

-- AddForeignKey
ALTER TABLE "FinancialLedger" ADD CONSTRAINT "FinancialLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementBatch" ADD CONSTRAINT "SettlementBatch_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlementBatchId_fkey" FOREIGN KEY ("settlementBatchId") REFERENCES "SettlementBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
