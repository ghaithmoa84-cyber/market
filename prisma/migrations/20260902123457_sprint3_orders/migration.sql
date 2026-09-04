-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'SEARCHING_COURIER', 'COURIER_ASSIGNED', 'COURIER_ACCEPTED', 'GOING_TO_STORE', 'SHOPPING', 'WAITING_CUSTOMER_APPROVAL', 'PURCHASED', 'DELIVERING', 'DELIVERED', 'CONFIRMED', 'SETTLEMENT_PENDING', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('CUSTOMER_INITIATED', 'ADMIN_INITIATED', 'AUTO_TIMEOUT', 'STORE_UNAVAILABLE', 'COURIER_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('PIECE', 'WEIGHT', 'VOLUME', 'PACKAGE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'PURCHASED', 'UNAVAILABLE', 'SUBSTITUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderActorType" AS ENUM ('CUSTOMER', 'COURIER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'SUBMITTED', 'SEARCHING_COURIER', 'COURIER_ASSIGNED', 'COURIER_ACCEPTED', 'GOING_TO_STORE', 'SHOPPING', 'ALTERNATIVE_PROPOSED', 'ALTERNATIVE_APPROVED', 'ALTERNATIVE_REJECTED', 'ALTERNATIVE_TIMEOUT', 'PRICE_APPROVAL_REQUESTED', 'PRICE_APPROVED', 'PRICE_REJECTED', 'ITEM_UNAVAILABLE', 'ITEM_PURCHASED', 'ORDER_PURCHASED', 'DELIVERING', 'DELIVERED', 'CUSTOMER_CONFIRMED', 'AUTO_CONFIRMED', 'CANCELLED', 'SETTLEMENT_PENDING', 'SETTLED', 'ADMIN_INTERVENTION');

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "addressText" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "deliveryNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "courierId" TEXT,
    "addressId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "cancelReason" "CancelReason",
    "subtotalExpected" DECIMAL(14,2) NOT NULL,
    "subtotalActual" DECIMAL(14,2),
    "deliveryFee" DECIMAL(14,2) NOT NULL,
    "yallaShare" DECIMAL(14,2) NOT NULL,
    "courierEarning" DECIMAL(14,2) NOT NULL,
    "totalExpected" DECIMAL(14,2) NOT NULL,
    "totalActual" DECIMAL(14,2),
    "noCourierAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStore" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "OrderStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderStoreId" TEXT NOT NULL,
    "productId" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "customDescription" TEXT,
    "unit" "ItemUnit" NOT NULL DEFAULT 'PIECE',
    "requestedQty" DECIMAL(10,3) NOT NULL,
    "actualQty" DECIMAL(10,3),
    "expectedPrice" DECIMAL(14,2) NOT NULL,
    "actualPrice" DECIMAL(14,2),
    "expectedTotal" DECIMAL(14,2) NOT NULL,
    "actualTotal" DECIMAL(14,2),
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorType" "OrderActorType" NOT NULL,
    "actorId" TEXT,
    "event" "OrderEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "userId" TEXT,
    "resourceId" TEXT,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_courierId_status_idx" ON "Order"("courierId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStore_orderId_storeId_key" ON "OrderStore"("orderId", "storeId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_userId_operation_idx" ON "IdempotencyRecord"("userId", "operation");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "CourierProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStore" ADD CONSTRAINT "OrderStore_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStore" ADD CONSTRAINT "OrderStore_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderStoreId_fkey" FOREIGN KEY ("orderStoreId") REFERENCES "OrderStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
