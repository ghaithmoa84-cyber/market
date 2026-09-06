import {
  OrderStatus,
  ItemStatus,
  AltStatus,
  OrderActorType,
  OrderEventType,
  Prisma,
} from "@prisma/client"
import prisma from "@/lib/prisma"
import { assertTransition, OrderStateError } from "@/lib/state-machine"
import {
  findIdempotentResult,
  recordIdempotencyResult,
  isUniqueViolation,
} from "@/lib/idempotency"
import config from "@/lib/config"
import {
  alternativeProposalSchema,
  alternativeResponseSchema,
} from "@/lib/validations/sprint5"
import { ServiceError } from "@/lib/errors"

export interface MarkUnavailableResult {
  id: string
  status: ItemStatus
}

export interface AlternativeResult {
  id: string
  status: AltStatus
  description: string
  price: number
  expiresAt: Date | null
  respondedAt: Date | null
}

export interface ProposeAlternativeInput {
  description: string
  price: number
  idempotencyKey: string
}

export interface RespondAlternativeInput {
  decision: "APPROVE" | "REJECT"
  idempotencyKey: string
}

export async function markItemUnavailable(
  orderId: string,
  itemId: string,
  courierUserId: string
): Promise<MarkUnavailableResult> {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
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
    select: { id: true, status: true },
  })
  if (!item) {
    throw new ServiceError("العنصر غير موجود", 404)
  }

  if (item.status !== ItemStatus.PENDING) {
    throw new ServiceError("العنصر ليس في حالة PENDING", 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.orderItem.update({
      where: { id: itemId },
      data: { status: ItemStatus.UNAVAILABLE },
      select: { id: true, status: true },
    })

    await tx.orderEvent.create({
      data: {
        order: { connect: { id: orderId } },
        actorType: OrderActorType.COURIER,
        actorId: courierUserId,
        event: OrderEventType.ITEM_UNAVAILABLE,
        metadata: { itemId },
      },
    })

    return {
      id: updated.id,
      status: updated.status,
    } as MarkUnavailableResult
  })

  return result
}

export async function proposeAlternative(
  orderId: string,
  itemId: string,
  courierUserId: string,
  input: ProposeAlternativeInput
): Promise<AlternativeResult> {
  const parsed = alternativeProposalSchema.parse(input)

  const cached = await findIdempotentResult(
    parsed.idempotencyKey,
    courierUserId,
    "PROPOSE_ALTERNATIVE"
  )
  if (cached) {
    throw new ServiceError("العملية مكررة", 409)
  }

  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
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
    select: { id: true, status: true },
  })
  if (!item) {
    throw new ServiceError("العنصر غير موجود", 404)
  }

  if (item.status !== ItemStatus.UNAVAILABLE) {
    throw new ServiceError("العنصر ليس في حالة UNAVAILABLE", 400)
  }

  const pendingAlternative = await prisma.alternative.findFirst({
    where: {
      orderItemId: itemId,
      status: AltStatus.PENDING,
    },
    select: { id: true },
  })
  if (pendingAlternative) {
    throw new ServiceError("يوجد اقتراح بديل معلق بالفعل لهذا العنصر", 400)
  }

  const expiresAt = new Date(
    Date.now() + config.timeouts.alternativeResponseMinutes * 60 * 1000
  )

  try {
    const result = await prisma.$transaction(async (tx) => {
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

      const alternative = await tx.alternative.create({
        data: {
          orderItem: { connect: { id: itemId } },
          description: parsed.description,
          price: new Prisma.Decimal(parsed.price),
          status: AltStatus.PENDING,
          expiresAt,
        },
        select: {
          id: true,
          status: true,
          description: true,
          price: true,
          expiresAt: true,
          respondedAt: true,
        },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          actorType: OrderActorType.COURIER,
          actorId: courierUserId,
          event: OrderEventType.ALTERNATIVE_PROPOSED,
          metadata: { alternativeId: alternative.id, itemId },
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
              type: "ALTERNATIVE_PROPOSAL",
              title: "اقتراح بديل للطلب",
              body: "تم اقتراح عنصر بديل لطلبك، يرجى المراجعة والرد",
              metadata: { orderId, alternativeId: alternative.id },
            },
          })
        }
      }

      const response: AlternativeResult = {
        id: alternative.id,
        status: alternative.status,
        description: alternative.description,
        price: Number(alternative.price),
        expiresAt: alternative.expiresAt,
        respondedAt: alternative.respondedAt,
      }

      await recordIdempotencyResult(
        parsed.idempotencyKey,
        "PROPOSE_ALTERNATIVE",
        alternative.id,
        response,
        tx,
        courierUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      const won = await findIdempotentResult(
        parsed.idempotencyKey,
        courierUserId,
        "PROPOSE_ALTERNATIVE"
      )
      if (won) {
        throw new ServiceError("العملية مكررة", 409)
      }
    }
    throw err
  }
}

export async function respondToAlternative(
  altId: string,
  customerUserId: string,
  input: RespondAlternativeInput
): Promise<AlternativeResult> {
  const parsed = alternativeResponseSchema.parse(input)

  const cached = await findIdempotentResult(
    parsed.idempotencyKey,
    customerUserId,
    "RESPOND_ALTERNATIVE"
  )
  if (cached) {
    throw new ServiceError("العملية مكررة", 409)
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: customerUserId },
    select: { id: true },
  })
  if (!profile) {
    throw new ServiceError("الملف الشخصي للعميل غير موجود", 404)
  }
  const customerId = profile.id

  const alternative = await prisma.alternative.findUnique({
    where: { id: altId },
    select: {
      id: true,
      status: true,
      description: true,
      price: true,
      expiresAt: true,
      respondedAt: true,
          orderItem: {
            select: {
              id: true,
              orderId: true,
              requestedQty: true,
              order: {
            select: {
              customerId: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (!alternative) {
    throw new ServiceError("الاقتراح البديل غير موجود", 404)
  }

  if (alternative.status !== AltStatus.PENDING) {
    throw new ServiceError("الاقتراح البديل غير معلق", 400)
  }

  if (alternative.orderItem.order.customerId !== customerId) {
    throw new ServiceError("غير مصرح لك بالرد على هذا الاقتراح", 403)
  }

  if (alternative.expiresAt && alternative.expiresAt < new Date()) {
    throw new ServiceError("انتهت مهلة الاقتراح البديل", 400)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentAlternative = await tx.alternative.findUnique({
        where: { id: altId },
      select: { status: true, orderItemId: true, price: true },
      })

      if (!currentAlternative || currentAlternative.status !== AltStatus.PENDING) {
        throw new ServiceError("الاقتراح البديل لم يعد معلقاً", 400)
      }

      if (parsed.decision === "APPROVE") {
        const existingApproved = await tx.alternative.findFirst({
          where: {
            orderItemId: currentAlternative.orderItemId,
            status: AltStatus.APPROVED,
          },
          select: { id: true },
        })
        if (existingApproved) {
          throw new ServiceError("تم اعتماد بديل آخر لنفس العنصر بالفعل", 400)
        }

        try {
          assertTransition(
            alternative.orderItem.order.status,
            OrderStatus.SHOPPING
          )
        } catch (err) {
          if (err instanceof OrderStateError) {
            throw new ServiceError("حالة الطلب غير صالحة", 400)
          }
          throw err
        }

        const updatedAlternative = await tx.alternative.update({
          where: { id: altId },
          data: {
            status: AltStatus.APPROVED,
            respondedAt: new Date(),
          },
          select: {
            id: true,
            status: true,
            description: true,
            price: true,
            expiresAt: true,
            respondedAt: true,
          },
        })

        await tx.orderItem.update({
          where: { id: alternative.orderItem.id },
          data: {
            status: ItemStatus.SUBSTITUTED,
            actualPrice: currentAlternative.price,
            actualQty: alternative.orderItem.requestedQty,
            actualTotal: currentAlternative.price.mul(alternative.orderItem.requestedQty),
          },
        })

        const pendingAlternatives = await tx.alternative.count({
          where: {
            orderItem: { orderId: alternative.orderItem.orderId },
            status: "PENDING",
            id: { not: altId },
          },
        })

        if (pendingAlternatives === 0) {
          await tx.order.update({
            where: { id: alternative.orderItem.orderId },
            data: { status: OrderStatus.SHOPPING },
          })
        }

        await tx.orderEvent.create({
          data: {
            order: { connect: { id: alternative.orderItem.orderId } },
            actorType: OrderActorType.CUSTOMER,
            actorId: customerUserId,
            event: OrderEventType.ALTERNATIVE_APPROVED,
            metadata: { alternativeId: altId, itemId: alternative.orderItem.id },
          },
        })

        const response: AlternativeResult = {
          id: updatedAlternative.id,
          status: updatedAlternative.status,
          description: updatedAlternative.description,
          price: Number(updatedAlternative.price),
          expiresAt: updatedAlternative.expiresAt,
          respondedAt: updatedAlternative.respondedAt,
        }

        await recordIdempotencyResult(
          parsed.idempotencyKey,
          "RESPOND_ALTERNATIVE",
          updatedAlternative.id,
          response,
          tx,
          customerUserId
        )

        return response
      }

      try {
        assertTransition(
          alternative.orderItem.order.status,
          OrderStatus.SHOPPING
        )
      } catch (err) {
        if (err instanceof OrderStateError) {
          throw new ServiceError("حالة الطلب غير صالحة", 400)
        }
        throw err
      }

      const updatedAlternative = await tx.alternative.update({
        where: { id: altId },
        data: {
          status: AltStatus.REJECTED,
          respondedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          description: true,
          price: true,
          expiresAt: true,
          respondedAt: true,
        },
      })

      await tx.orderItem.update({
        where: { id: alternative.orderItem.id },
        data: { status: ItemStatus.UNAVAILABLE },
      })

      const pendingAlternatives = await tx.alternative.count({
        where: {
          orderItem: { orderId: alternative.orderItem.orderId },
          status: "PENDING",
          id: { not: altId },
        },
      })

      if (pendingAlternatives === 0) {
        await tx.order.update({
          where: { id: alternative.orderItem.orderId },
          data: { status: OrderStatus.SHOPPING },
        })
      }

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: alternative.orderItem.orderId } },
          actorType: OrderActorType.CUSTOMER,
          actorId: customerUserId,
          event: OrderEventType.ALTERNATIVE_REJECTED,
          metadata: { alternativeId: altId, itemId: alternative.orderItem.id },
        },
      })

      const response: AlternativeResult = {
        id: updatedAlternative.id,
        status: updatedAlternative.status,
        description: updatedAlternative.description,
        price: Number(updatedAlternative.price),
        expiresAt: updatedAlternative.expiresAt,
        respondedAt: updatedAlternative.respondedAt,
      }

      await recordIdempotencyResult(
        parsed.idempotencyKey,
        "RESPOND_ALTERNATIVE",
        updatedAlternative.id,
        response,
        tx,
        customerUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      const won = await findIdempotentResult(
        parsed.idempotencyKey,
        customerUserId,
        "RESPOND_ALTERNATIVE"
      )
      if (won) {
        throw new ServiceError("العملية مكررة", 409)
      }
    }
    throw err
  }
}

export async function timeoutAlternative(altId: string): Promise<AlternativeResult> {
  const alternative = await prisma.alternative.findFirst({
    where: {
      id: altId,
      status: AltStatus.PENDING,
    },
    select: {
      id: true,
      status: true,
      description: true,
      price: true,
      expiresAt: true,
      respondedAt: true,
      orderItem: {
        select: {
          id: true,
          orderId: true,
        },
      },
    },
  })

  if (!alternative) {
    throw new ServiceError("الاقتراح البديل غير موجود", 404)
  }

  if (!alternative.expiresAt || alternative.expiresAt >= new Date()) {
    throw new ServiceError("الاقتراح البديل لم ينتهِ بعد", 400)
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentAlternative = await tx.alternative.findUnique({
      where: { id: altId },
      select: { status: true, orderItemId: true },
    })

    if (!currentAlternative || currentAlternative.status !== AltStatus.PENDING) {
      throw new ServiceError("الاقتراح البديل لم يعد معلقاً", 409)
    }

    assertTransition(
      await tx.orderItem
        .findUnique({
          where: { id: alternative.orderItem.id },
          select: { order: { select: { status: true } } },
        })
        .then((item) => item?.order.status ?? OrderStatus.CANCELLED),
      OrderStatus.SHOPPING
    )

    const updatedAlternative = await tx.alternative.update({
      where: { id: altId },
      data: {
        status: AltStatus.TIMEOUT,
      },
      select: {
        id: true,
        status: true,
        description: true,
        price: true,
        expiresAt: true,
        respondedAt: true,
      },
    })

    await tx.orderItem.update({
      where: { id: alternative.orderItem.id },
      data: { status: ItemStatus.UNAVAILABLE },
    })

    await tx.order.update({
      where: { id: alternative.orderItem.orderId },
      data: { status: OrderStatus.SHOPPING },
    })

    await tx.orderEvent.create({
      data: {
        order: { connect: { id: alternative.orderItem.orderId } },
        actorType: OrderActorType.SYSTEM,
        event: OrderEventType.ALTERNATIVE_TIMEOUT,
        metadata: { alternativeId: altId, itemId: alternative.orderItem.id },
      },
    })

    return {
      id: updatedAlternative.id,
      status: updatedAlternative.status,
      description: updatedAlternative.description,
      price: Number(updatedAlternative.price),
      expiresAt: updatedAlternative.expiresAt,
      respondedAt: updatedAlternative.respondedAt,
    } as AlternativeResult
  })

  return result
}
