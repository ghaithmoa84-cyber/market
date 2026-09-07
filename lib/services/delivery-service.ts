import prisma from "@/lib/prisma"
import { assertTransition } from "@/lib/state-machine"
import {
  findIdempotentResult,
  recordIdempotencyResult,
  isUniqueViolation,
} from "@/lib/idempotency"
import { ServiceError } from "@/lib/errors"
import config from "@/lib/config"
import { postLedgerEntries } from "./finance-service"
import { Order, OrderStatus, CourierStatus } from "@prisma/client"

export async function confirmDelivery(
  orderId: string,
  courierId: string,
  idempotencyKey: string
): Promise<Order> {
  const profile = await prisma.courierProfile.findUnique({
    where: { id: courierId },
    select: { userId: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للمندوب غير موجود", 404)
  }
  const courierUserId = profile.userId

  const cached = await findIdempotentResult(idempotencyKey, courierUserId, "CONFIRM_DELIVERY")
  if (cached) {
    return JSON.parse(cached.response) as Order
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, courierId: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }
  if (order.courierId !== courierId) {
    throw new ServiceError("الطلب غير مسند لهذا المندوب", 403)
  }
  if (order.status !== OrderStatus.DELIVERING) {
    throw new ServiceError("الطلب ليس في حالة توصيل نشطة", 400)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      assertTransition(OrderStatus.DELIVERING, OrderStatus.DELIVERED)

      const updated = await tx.order.update({
        where: { id: orderId, status: OrderStatus.DELIVERING },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: "COURIER",
          actorId: courierUserId,
          event: "DELIVERED",
        },
      })

      await tx.courierProfile.updateMany({
        where: {
          id: courierId,
          status: CourierStatus.BUSY,
        },
        data: { status: CourierStatus.AVAILABLE },
      })

      await recordIdempotencyResult(
        idempotencyKey,
        "CONFIRM_DELIVERY",
        orderId,
        updated,
        tx,
        courierUserId
      )

      return updated
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      const won = await findIdempotentResult(idempotencyKey, courierUserId, "CONFIRM_DELIVERY")
      if (won?.response) return JSON.parse(won.response) as Order
    }
    throw err
  }
}

export async function confirmByCustomer(
  orderId: string,
  customerUserId: string,
  idempotencyKey: string
): Promise<Order> {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId: customerUserId },
    select: { id: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للعميل غير موجود", 404)
  }
  const customerId = profile.id

  const cached = await findIdempotentResult(idempotencyKey, customerUserId, "CONFIRM_BY_CUSTOMER")
  if (cached) {
    return JSON.parse(cached.response) as Order
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, customerId: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }
  if (order.customerId !== customerId) {
    throw new ServiceError("الطلب غير مملوك لهذا العميل", 403)
  }
  if (order.status !== OrderStatus.DELIVERED) {
    throw new ServiceError("الطلب ليس في حالة تم التسليم", 400)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      assertTransition(OrderStatus.DELIVERED, OrderStatus.CONFIRMED)

      await tx.order.update({
        where: { id: orderId, status: OrderStatus.DELIVERED },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: "CUSTOMER",
          actorId: customerUserId,
          event: "CUSTOMER_CONFIRMED",
        },
      })

      await postLedgerEntries(orderId, tx)

      assertTransition(OrderStatus.CONFIRMED, OrderStatus.SETTLEMENT_PENDING)

      await tx.order.update({
        where: { id: orderId, status: OrderStatus.CONFIRMED },
        data: { status: OrderStatus.SETTLEMENT_PENDING },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: "SYSTEM",
          event: "SETTLEMENT_PENDING",
        },
      })

      const updated = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!updated) throw new ServiceError("الطلب غير موجود", 404)
      const response = updated

      await recordIdempotencyResult(
        idempotencyKey,
        "CONFIRM_BY_CUSTOMER",
        orderId,
        response,
        tx,
        customerUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      const won = await findIdempotentResult(idempotencyKey, customerUserId, "CONFIRM_BY_CUSTOMER")
      if (won?.response) return JSON.parse(won.response) as Order
    }
    throw err
  }
}

async function findFullOrder(orderId: string): Promise<Order> {
  const fullOrder = await prisma.order.findUnique({
    where: { id: orderId },
  })
  if (!fullOrder) {
    throw new ServiceError("الطلب غير موجود", 404)
  }
  return fullOrder
}

export async function autoConfirm(orderId: string): Promise<Order> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, deliveredAt: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }
  if (order.status !== OrderStatus.DELIVERED) {
    return findFullOrder(orderId)
  }
  if (!order.deliveredAt) {
    return findFullOrder(orderId)
  }

  const timeoutMs = config.timeouts.autoConfirmMinutes * 60 * 1000
  if (Date.now() - order.deliveredAt.getTime() < timeoutMs) {
    return findFullOrder(orderId)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      assertTransition(OrderStatus.DELIVERED, OrderStatus.CONFIRMED)

      await tx.order.update({
        where: { id: orderId, status: OrderStatus.DELIVERED },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: "SYSTEM",
          event: "AUTO_CONFIRMED",
        },
      })

      await postLedgerEntries(orderId, tx)

      assertTransition(OrderStatus.CONFIRMED, OrderStatus.SETTLEMENT_PENDING)

      await tx.order.update({
        where: { id: orderId, status: OrderStatus.CONFIRMED },
        data: { status: OrderStatus.SETTLEMENT_PENDING },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: "SYSTEM",
          event: "SETTLEMENT_PENDING",
        },
      })

      const updated = await tx.order.findUnique({
        where: { id: orderId },
      })
      if (!updated) {
        throw new ServiceError("الطلب غير موجود", 404)
      }

      return updated
    })

    return result
  } catch (err) {
    console.error(`autoConfirm failed for order ${orderId}:`, err)
    throw err
  }
}

export async function checkAndAutoConfirm(): Promise<void> {
  const timeoutMs = config.timeouts.autoConfirmMinutes * 60 * 1000
  const cutoff = new Date(Date.now() - timeoutMs)

  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.DELIVERED,
      deliveredAt: { not: null, lt: cutoff },
    },
    select: { id: true },
    orderBy: { deliveredAt: "asc" },
    take: 50,
  })

  for (const order of orders) {
    try {
      await autoConfirm(order.id)
    } catch (err) {
      console.error(`checkAndAutoConfirm: failed for order ${order.id}:`, err)
    }
  }
}
