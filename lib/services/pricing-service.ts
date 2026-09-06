import { calculatePricing, calculateDeliveryFee, PricingBreakdown } from "@/lib/pricing"
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { assertTransition, OrderStateError } from "@/lib/state-machine"
import {
  findIdempotentResult,
  recordIdempotencyResult,
} from "@/lib/idempotency"
import config from "@/lib/config"
import { ServiceError } from "@/lib/errors"
import { OrderItem, OrderStatus, ItemStatus, OrderActorType, OrderEventType } from "@prisma/client"

export interface CartLine {
  unitPrice: number
  quantity: number
}

export interface CartPricingResult {
  subtotal: number
  breakdown: PricingBreakdown
}

// تقدير سعر السلة قبل الإنشاء (Server is the source of truth).
// الأسعار النهائية للطلب تُحسب دائماً على الخادم، لا تعتمد على قيمة المتصفح.
export function computeCartPricing(lines: CartLine[]): CartPricingResult {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  )
  const breakdown = calculatePricing(subtotal)
  return { subtotal: breakdown.subtotal, breakdown }
}

export async function recordActualItem(
  orderId: string,
  itemId: string,
  courierId: string,
  data: {
    actualQty: number
    actualPrice: number
    idempotencyKey: string
  }
): Promise<{ orderItem: OrderItem; requiresApproval: boolean }> {
  const cached = await findIdempotentResult(
    data.idempotencyKey,
    courierId,
    "RECORD_ACTUAL_ITEM"
  )
  if (cached) {
    return JSON.parse(cached.response)
  }

  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierId },
    select: { id: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للمندوب غير موجود", 404)
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, courierId: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }

  if (order.courierId !== profile.id) {
    throw new ServiceError("الطلب غير مسند لهذا المندوب", 403)
  }

  const item = await prisma.orderItem.findFirst({
    where: {
      id: itemId,
      orderId,
    },
    select: { id: true, status: true, expectedPrice: true },
  })
  if (!item) {
    throw new ServiceError("العنصر غير موجود", 404)
  }

  if (item.status !== ItemStatus.PENDING) {
    throw new ServiceError("العنصر ليس في حالة PENDING", 400)
  }

  const actualQtyDecimal = new Prisma.Decimal(data.actualQty)
  const actualPriceDecimal = new Prisma.Decimal(data.actualPrice)
  const actualTotal = actualQtyDecimal.mul(actualPriceDecimal)
  const expectedPriceDecimal = new Prisma.Decimal(item.expectedPrice)
  if (expectedPriceDecimal.isZero()) {
    throw new ServiceError("السعر المتوقع غير صالح", 400)
  }
  const diff = actualPriceDecimal.sub(expectedPriceDecimal).abs().div(expectedPriceDecimal)
  const threshold = new Prisma.Decimal(config.pricing.priceChangeApprovalThreshold)

  const result = await prisma.$transaction(async (tx) => {
    if (diff.gt(threshold)) {
      try {
        assertTransition(order.status, OrderStatus.WAITING_CUSTOMER_APPROVAL)
      } catch (err) {
        if (err instanceof OrderStateError) {
          throw new ServiceError("حالة الطلب غير صالحة", 400)
        }
        throw err
      }

      await tx.order.update({
        where: { id: orderId, status: order.status },
        data: { status: OrderStatus.WAITING_CUSTOMER_APPROVAL },
      })

      const updateResult = await tx.orderItem.updateMany({
        where: {
          id: itemId,
          orderId,
          status: ItemStatus.PENDING,
        },
        data: {
          actualQty: actualQtyDecimal,
          actualPrice: actualPriceDecimal,
          actualTotal: actualTotal,
        },
      })

      if (updateResult.count === 0) {
        const item = await tx.orderItem.findUnique({ where: { id: itemId } })
        return { orderItem: item!, requiresApproval: false }
      }

      const updatedItem = await tx.orderItem.findUnique({
        where: { id: itemId },
      }) as OrderItem

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: OrderActorType.COURIER,
          actorId: courierId,
          event: OrderEventType.PRICE_APPROVAL_REQUESTED,
          metadata: { itemId },
        },
      })

      const customer = await tx.order.findUnique({
        where: { id: orderId },
        select: { customerId: true },
      })

      if (customer) {
        const customerProfile = await tx.customerProfile.findUnique({
          where: { id: customer.customerId },
          select: { userId: true },
        })

        if (customerProfile) {
          await tx.notification.create({
            data: {
              userId: customerProfile.userId,
              type: "PRICE_APPROVAL",
              title: "طلب موافقة على السعر",
              body: "تم تسجيل سعر مختلف لطلبك، يرجى المراجعة والموافقة",
              metadata: { orderId, itemId },
            },
          })
        }
      }

      await recordIdempotencyResult(
        data.idempotencyKey,
        "RECORD_ACTUAL_ITEM",
        itemId,
        { requiresApproval: true },
        tx,
        courierId
      )

      return { orderItem: updatedItem, requiresApproval: true }
    }

    const updateResult = await tx.orderItem.updateMany({
      where: {
        id: itemId,
        orderId,
        status: ItemStatus.PENDING,
      },
      data: {
        actualQty: actualQtyDecimal,
        actualPrice: actualPriceDecimal,
        actualTotal: actualTotal,
        status: ItemStatus.PURCHASED,
      },
    })

    if (updateResult.count === 0) {
      const item = await tx.orderItem.findUnique({ where: { id: itemId } })
      return { orderItem: item!, requiresApproval: false }
    }

    const updatedItem = await tx.orderItem.findUnique({
      where: { id: itemId },
    }) as OrderItem

    await tx.orderEvent.create({
      data: {
        order: { connect: { id: orderId } },
        actorType: OrderActorType.COURIER,
        actorId: courierId,
        event: OrderEventType.ITEM_PURCHASED,
        metadata: { itemId },
      },
    })

    await recordIdempotencyResult(
      data.idempotencyKey,
      "RECORD_ACTUAL_ITEM",
      itemId,
      { requiresApproval: false },
      tx,
      courierId
    )

    return { orderItem: updatedItem as OrderItem, requiresApproval: false }
  })

  return result
}

export async function respondToPriceApproval(
  orderId: string,
  itemId: string,
  customerUserId: string,
  data: {
    decision: "APPROVE" | "REJECT"
    idempotencyKey: string
  }
): Promise<OrderItem> {
  const cached = await findIdempotentResult(
    data.idempotencyKey,
    customerUserId,
    "RESPOND_TO_PRICE_APPROVAL"
  )
  if (cached) {
    return JSON.parse(cached.response)
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: customerUserId },
    select: { id: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للعميل غير موجود", 404)
  }
  const customerId = profile.id

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, customerId: true },
  })
  if (!order) {
    throw new ServiceError("الطلب غير موجود", 404)
  }

  if (order.customerId !== customerId) {
    throw new ServiceError("غير مصرح لك بالرد على هذا الطلب", 403)
  }

  if (order.status !== OrderStatus.WAITING_CUSTOMER_APPROVAL) {
    throw new ServiceError("الطلب ليس في حالة انتظار الموافقة", 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentItem = await tx.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
      },
      select: { id: true, status: true, actualPrice: true },
    })

    if (!currentItem) {
      throw new ServiceError("العنصر غير موجود", 404)
    }

    if (currentItem.status !== 'PENDING' || currentItem.actualPrice === null) {
      throw new ServiceError("حالة العنصر غير صالحة أو لا يوجد سعر فعلي مسجل", 400)
    }

    if (data.decision === "APPROVE") {
      try {
        assertTransition(order.status, OrderStatus.SHOPPING)
      } catch (err) {
        if (err instanceof OrderStateError) {
          throw new ServiceError("حالة الطلب غير صالحة", 400)
        }
        throw err
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: ItemStatus.PURCHASED },
      })

      const pendingAlternatives = await tx.alternative.count({
        where: {
          orderItem: { orderId },
          status: "PENDING",
        },
      })

      const pendingPriceApprovals = await tx.orderItem.count({
        where: {
          orderId,
          id: { not: itemId },
          actualPrice: { not: null },
          status: "PENDING",
        },
      })

      if (pendingAlternatives === 0 && pendingPriceApprovals === 0) {
        await tx.order.update({
          where: { id: orderId, status: order.status },
          data: { status: OrderStatus.SHOPPING },
        })
      }

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: OrderActorType.CUSTOMER,
          actorId: customerUserId,
          event: OrderEventType.PRICE_APPROVED,
          metadata: { itemId },
        },
      })

      await recordIdempotencyResult(
        data.idempotencyKey,
        "RESPOND_TO_PRICE_APPROVAL",
        itemId,
        updatedItem,
        tx,
        customerUserId
      )

      return updatedItem
    }

    try {
      assertTransition(order.status, OrderStatus.SHOPPING)
    } catch (err) {
      if (err instanceof OrderStateError) {
        throw new ServiceError("حالة الطلب غير صالحة", 400)
      }
      throw err
    }

    const updatedItem = await tx.orderItem.update({
      where: { id: itemId },
      data: {
        status: ItemStatus.UNAVAILABLE,
        actualPrice: null,
        actualQty: null,
        actualTotal: null,
      },
    })

    const pendingAlternatives = await tx.alternative.count({
      where: {
        orderItem: { orderId },
        status: "PENDING",
      },
    })

    const pendingPriceApprovals = await tx.orderItem.count({
      where: {
        orderId,
        id: { not: itemId },
        actualPrice: { not: null },
        status: "PENDING",
      },
    })

    if (pendingAlternatives === 0 && pendingPriceApprovals === 0) {
      await tx.order.update({
        where: { id: orderId, status: order.status },
        data: { status: OrderStatus.SHOPPING },
      })
    }

    await tx.orderEvent.create({
      data: {
        order: { connect: { id: orderId } },
        actorType: OrderActorType.CUSTOMER,
        actorId: customerUserId,
        event: OrderEventType.PRICE_REJECTED,
        metadata: { itemId },
      },
    })

    await recordIdempotencyResult(
      data.idempotencyKey,
      "RESPOND_TO_PRICE_APPROVAL",
      itemId,
      updatedItem,
      tx,
      customerUserId
    )

    return updatedItem
  })

  return result
}

export { calculatePricing, calculateDeliveryFee }
export type { PricingBreakdown }
