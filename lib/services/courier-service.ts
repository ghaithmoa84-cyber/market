import {
  OrderStatus,
  CourierStatus,
  OrderActorType,
  OrderEventType,
  Prisma,
} from "@prisma/client"
import prisma from "@/lib/prisma"
import { assertTransition } from "@/lib/state-machine"
import {
  findIdempotentResult,
  recordIdempotencyResult,
  isUniqueViolation,
} from "@/lib/idempotency"

export interface CourierStatusUpdate {
  status: CourierStatus
}

export interface AvailableOrder {
  id: string
  status: OrderStatus
  subtotalExpected: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  totalExpected: number
  noCourierAt: Date | null
  createdAt: Date
  customer: {
    id: string
    name: string
  }
  address: {
    id: string
    addressText: string
    lat: number | null
    lng: number | null
    deliveryNotes: string | null
  }
  orderStores: {
    id: string
    store: {
      id: string
      name: string
      address: string
    }
    items: {
      id: string
      productId: string | null
      isCustom: boolean
      customDescription: string | null
      unit: string
      requestedQty: number
      expectedPrice: number
      expectedTotal: number
    }[]
  }[]
}

export interface AcceptOrderInput {
  orderId: string
  idempotencyKey: string
}

export interface AcceptOrderResult {
  orderId: string
  status: OrderStatus
  courierId: string
}

export interface TransitionInput {
  orderId: string
  to: OrderStatus
  idempotencyKey: string
}

export interface TransitionResult {
  orderId: string
  status: OrderStatus
}

export async function getAvailableOrders(courierUserId: string): Promise<AvailableOrder[]> {
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
    select: { id: true },
  })
  if (!profile) {
    throw new Error("الملف الشخصي للمندوب غير موجود")
  }

  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.SEARCHING_COURIER,
      courierId: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      subtotalExpected: true,
      deliveryFee: true,
      yallaShare: true,
      courierEarning: true,
      totalExpected: true,
      noCourierAt: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          user: {
            select: { name: true },
          },
        },
      },
      address: {
        select: {
          id: true,
          addressText: true,
          lat: true,
          lng: true,
          deliveryNotes: true,
        },
      },
      orderStores: {
        select: {
          id: true,
          store: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          items: {
            select: {
              id: true,
              productId: true,
              isCustom: true,
              customDescription: true,
              unit: true,
              requestedQty: true,
              expectedPrice: true,
              expectedTotal: true,
            },
          },
        },
      },
    },
  })

  return orders.map((order) => ({
    ...order,
    subtotalExpected: Number(order.subtotalExpected),
    deliveryFee: Number(order.deliveryFee),
    yallaShare: Number(order.yallaShare),
    courierEarning: Number(order.courierEarning),
    totalExpected: Number(order.totalExpected),
    customer: {
      id: order.customer.id,
      name: (order.customer as { user?: { name: string } }).user?.name ?? "",
    },
    orderStores: order.orderStores.map((os) => ({
      ...os,
      items: os.items.map((item) => ({
        ...item,
        requestedQty: Number(item.requestedQty),
        expectedPrice: Number(item.expectedPrice),
        expectedTotal: Number(item.expectedTotal),
      })),
    })),
  })) as AvailableOrder[]
}

export async function updateCourierStatus(
  userId: string,
  input: CourierStatusUpdate
): Promise<void> {
  if (input.status === CourierStatus.AVAILABLE || input.status === CourierStatus.OFFLINE) {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "CourierProfile" WHERE "userId" = ${userId} FOR UPDATE
      `
      if (!profile || profile.length === 0) {
        throw new Error("الملف الشخصي للمندوب غير موجود")
      }
      const profileId = profile[0].id

      const activeOrder = await tx.order.findFirst({
        where: {
          courierId: profileId,
          status: {
            in: [
              OrderStatus.SEARCHING_COURIER,
              OrderStatus.COURIER_ASSIGNED,
              OrderStatus.COURIER_ACCEPTED,
              OrderStatus.GOING_TO_STORE,
              OrderStatus.SHOPPING,
            ],
          },
        },
        select: { id: true },
      })
      if (activeOrder) {
        throw new Error("لا يمكن تغيير الحالة أثناء وجود طلب نشط")
      }

      await tx.courierProfile.update({
        where: { userId },
        data: { status: input.status },
      })
    })
    return
  }

  await prisma.courierProfile.update({
    where: { userId },
    data: { status: input.status },
  })
}

export async function acceptOrder(
  courierUserId: string,
  input: AcceptOrderInput
): Promise<AcceptOrderResult> {
  const cached = await findIdempotentResult(input.idempotencyKey, courierUserId, "COURIER_ACCEPT_ORDER")
  if (cached) {
    return cached.response as AcceptOrderResult
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT id, status FROM "CourierProfile" WHERE "userId" = ${courierUserId} FOR UPDATE
      `
      if (!profile || profile.length === 0) {
        throw new Error("الملف الشخصي للمندوب غير موجود")
      }
      const profileData = profile[0]

      if (profileData.status === CourierStatus.OFFLINE) {
        throw new Error("المندوب غير متصل")
      }

      const activeOrder = await tx.order.findFirst({
        where: {
          courierId: profileData.id,
          status: {
            in: [
              OrderStatus.SEARCHING_COURIER,
              OrderStatus.COURIER_ASSIGNED,
              OrderStatus.COURIER_ACCEPTED,
              OrderStatus.GOING_TO_STORE,
              OrderStatus.SHOPPING,
            ],
          },
        },
        select: { id: true },
      })
      if (activeOrder) {
        throw new Error("لا يمكن قبول طلب جديد أثناء وجود طلب نشط")
      }

      const updated = await tx.$queryRaw`
        UPDATE "Order"
        SET status = 'COURIER_ASSIGNED'::"OrderStatus", "courierId" = ${profileData.id}
        WHERE id = ${input.orderId} AND status::text = 'SEARCHING_COURIER'::text AND "courierId" IS NULL
        RETURNING id, status, "courierId"
      `
      const rows = updated as { id: string; status: OrderStatus; courierId: string }[]
      if (!rows || rows.length === 0) {
        throw new Error("الطلب غير متاح للقبول")
      }
      const order = rows[0]

      assertTransition(OrderStatus.SEARCHING_COURIER, OrderStatus.COURIER_ASSIGNED)

      if (profileData.status === CourierStatus.AVAILABLE) {
        await tx.courierProfile.update({
          where: { id: profileData.id },
          data: { status: CourierStatus.BUSY },
        })
      }

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: order.id } },
          actorType: OrderActorType.COURIER,
          actorId: courierUserId,
          event: "COURIER_ASSIGNED",
        },
      })

      const response: AcceptOrderResult = {
        orderId: order.id,
        status: order.status,
        courierId: order.courierId ?? profileData.id,
      }

      await recordIdempotencyResult(
        input.idempotencyKey,
        "COURIER_ACCEPT_ORDER",
        order.id,
        response,
        tx,
        courierUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const won = await findIdempotentResult(input.idempotencyKey, courierUserId, "COURIER_ACCEPT_ORDER")
        if (won) return won.response as AcceptOrderResult
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
    throw err
  }
}

export async function transitionOrderStatus(
  courierUserId: string,
  input: TransitionInput
): Promise<TransitionResult> {
  const cached = await findIdempotentResult(input.idempotencyKey, courierUserId, `COURIER_TRANSITION_${input.to}`)
  if (cached) {
    return cached.response as TransitionResult
  }

  const profile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId },
    select: { id: true },
  })
  if (!profile) {
    throw new Error("الملف الشخصي للمندوب غير موجود")
  }

  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      courierId: profile.id,
    },
    select: { id: true, status: true },
  })
  if (!order) {
    throw new Error("الطلب غير موجود أو غير مسند لهذا المندوب")
  }

  assertTransition(order.status, input.to)

  const eventMap: Partial<Record<OrderStatus, OrderEventType>> = {
    [OrderStatus.COURIER_ACCEPTED]: "COURIER_ACCEPTED",
    [OrderStatus.GOING_TO_STORE]: "GOING_TO_STORE",
    [OrderStatus.SHOPPING]: "SHOPPING",
  }

  const eventType = eventMap[input.to]
  if (!eventType) {
    throw new Error(`Transition event غير معروف: ${input.to}`)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: input.orderId, status: order.status },
        data: { status: input.to },
        select: { id: true, status: true },
      })

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: updated.id } },
          actorType: OrderActorType.COURIER,
          actorId: courierUserId,
          event: eventType,
        },
      })

      const response: TransitionResult = {
        orderId: updated.id,
        status: updated.status,
      }

      await recordIdempotencyResult(
        input.idempotencyKey,
        `COURIER_TRANSITION_${input.to}`,
        updated.id,
        response,
        tx,
        courierUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      throw new Error("الطلب غير موجود أو غير مسند لهذا المندوب")
    }
    if (isUniqueViolation(err)) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const won = await findIdempotentResult(input.idempotencyKey, courierUserId, `COURIER_TRANSITION_${input.to}`)
        if (won) return won.response as TransitionResult
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
    throw err
  }
}
