import { Prisma, OrderStatus, SettlementStatus, OrderActorType, OrderEventType, SettlementBatch } from "@prisma/client"
import prisma from "@/lib/prisma"
import {
  findIdempotentResult,
  recordIdempotencyResult,
  isUniqueViolation,
} from "@/lib/idempotency"
import { ServiceError } from "@/lib/errors"
import { assertTransition } from "@/lib/state-machine"

export async function postLedgerEntries(
  orderId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { yallaShare: true, courierEarning: true, courierId: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }
  if (!order.courierId) {
    throw new ServiceError("لا يوجد مندوب مسند للطلب", 400)
  }

  await tx.financialLedger.createMany({
    data: [
      {
        orderId,
        courierId: order.courierId,
        type: "YALLA_SHARE",
        direction: "CREDIT",
        amount: order.yallaShare,
        idempotencyKey: `ledger-${orderId}-yalla`,
      },
      {
        orderId,
        courierId: order.courierId,
        type: "COURIER_EARNING",
        direction: "CREDIT",
        amount: order.courierEarning,
        idempotencyKey: `ledger-${orderId}-courier`,
      },
    ],
    skipDuplicates: true,
  })
}

export async function createSettlementBatch(
  courierId: string,
  settlementDate: Date,
  _adminId: string
): Promise<SettlementBatch> {
  const profile = await prisma.courierProfile.findUnique({
    where: { id: courierId },
    select: { id: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للمندوب غير موجود", 404)
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: {
          courierId: profile.id,
          status: OrderStatus.SETTLEMENT_PENDING,
          settlementItems: { none: {} },
        },
        select: {
          id: true,
          yallaShare: true,
          courierEarning: true,
          deliveryFee: true,
        },
      })

      if (orders.length === 0) {
        throw new ServiceError("لا توجد أوامر مستحقة التسوية لهذا المندوب", 400)
      }

      let totalDeliveryFees = new Prisma.Decimal(0)
      let totalYallaShare = new Prisma.Decimal(0)
      let totalCourierEarnings = new Prisma.Decimal(0)

      for (const order of orders) {
        totalDeliveryFees = totalDeliveryFees.add(order.deliveryFee)
        totalYallaShare = totalYallaShare.add(order.yallaShare)
        totalCourierEarnings = totalCourierEarnings.add(order.courierEarning)
      }

      const amountDue = totalCourierEarnings

      const batch = await tx.settlementBatch.create({
        data: {
          courierId: profile.id,
          settlementDate,
          totalDeliveryFees,
          totalYallaShare,
          totalCourierEarnings,
          amountDue,
          amountSettled: new Prisma.Decimal(0),
          status: "PENDING",
        },
      })

      await tx.settlementItem.createMany({
        data: orders.map((order) => ({
          settlementBatchId: batch.id,
          orderId: order.id,
          yallaShare: order.yallaShare,
          amountSettled: new Prisma.Decimal(0),
        })),
      })

      return batch
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      const target = (err as { meta?: { target?: string[] } }).meta?.target
      if (target?.includes("orderId")) {
        throw new ServiceError("أحد الطلبات موجود في تسوية سابقة", 409)
      }
      throw new ServiceError("يوجد تسوية لهذا المندوب في نفس التاريخ", 409)
    }
    throw err
  }
}

export async function markSettled(
  batchId: string,
  adminId: string,
  amountSettled: Prisma.Decimal,
  idempotencyKey: string
): Promise<SettlementBatch> {
  const cached = await findIdempotentResult(idempotencyKey, adminId, "MARK_SETTLED")
  if (cached) {
    return JSON.parse(cached.response) as SettlementBatch
  }

  const batch = await prisma.settlementBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true, amountDue: true, amountSettled: true },
  })
  if (!batch) {
    throw new ServiceError("دفعة التسوية غير موجودة", 404)
  }

  if (batch.status === "SETTLED") {
    const settled = await prisma.settlementBatch.findUnique({
      where: { id: batchId },
    })
    return settled as SettlementBatch
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentBatch = await tx.settlementBatch.findUnique({
        where: { id: batchId },
        select: { amountDue: true, amountSettled: true, status: true },
      })
      if (!currentBatch) {
        throw new ServiceError("الدفعة غير موجودة", 404)
      }

      const totalPaid = new Prisma.Decimal(currentBatch.amountSettled).add(
        amountSettled
      )
      if (totalPaid.gt(new Prisma.Decimal(currentBatch.amountDue))) {
        throw new ServiceError("المبلغ الإجمالي يتجاوز المستحق", 400)
      }

      const isFullPayment = totalPaid.gte(new Prisma.Decimal(currentBatch.amountDue))
      const newStatus = isFullPayment ? SettlementStatus.SETTLED : SettlementStatus.PARTIAL

      const updatedBatch = await tx.settlementBatch.update({
        where: { id: batchId },
        data: {
          status: newStatus,
          amountSettled: totalPaid,
          settledAt: new Date(),
          settledBy: adminId,
        },
      })

      if (isFullPayment) {
        const items = await tx.settlementItem.findMany({
          where: { settlementBatchId: batchId },
          select: {
            id: true,
            orderId: true,
            order: { select: { status: true } },
            yallaShare: true,
          },
        })

        const totalYallaShare = items.reduce(
          (sum, item) => sum.add(item.yallaShare),
          new Prisma.Decimal(0)
        )

        for (const item of items) {
          assertTransition(item.order.status, OrderStatus.SETTLED)

          await tx.order.update({
            where: { id: item.orderId },
            data: { status: OrderStatus.SETTLED },
          })

          await tx.orderEvent.create({
            data: {
              orderId: item.orderId,
              actorType: OrderActorType.ADMIN,
              actorId: adminId,
              event: OrderEventType.SETTLED,
            },
          })

          const itemAmountSettled = totalYallaShare.isZero()
            ? new Prisma.Decimal(0)
            : item.yallaShare
                .div(totalYallaShare)
                .mul(totalPaid)
                .toDecimalPlaces(2)

          await tx.settlementItem.update({
            where: { id: item.id },
            data: { amountSettled: itemAmountSettled },
          })
        }
      }

      const response = updatedBatch

      await recordIdempotencyResult(
        idempotencyKey,
        "MARK_SETTLED",
        batchId,
        response,
        tx,
        adminId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      const won = await findIdempotentResult(idempotencyKey, adminId, "MARK_SETTLED")
      if (won?.response) return JSON.parse(won.response) as SettlementBatch
    }
    throw err
  }
}
