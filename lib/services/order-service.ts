import { ItemUnit, OrderStatus, Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { calculatePricing } from "@/lib/pricing"
import { assertTransition } from "@/lib/state-machine"
import {
  findIdempotentResult,
  recordIdempotencyResult,
  isUniqueViolation,
} from "@/lib/idempotency"

export interface CartItemInput {
  storeId: string
  productId?: string
  isCustom?: boolean
  customDescription?: string
  requestedQty: number
  unit?: string
  expectedPrice?: number
}

export interface CreateOrderInput {
  addressId: string
  idempotencyKey: string
  items: CartItemInput[]
}

export interface OrderItemResult {
  itemId: string
  productId?: string | null
  isCustom: boolean
  customDescription?: string | null
  requestedQty: number
  unit: string
  expectedPrice: number
  expectedTotal: number
}

export interface OrderStoreResult {
  storeId: string
  items: OrderItemResult[]
}

export interface OrderResult {
  orderId: string
  status: string
  customerId: string
  addressId: string
  subtotalExpected: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  totalExpected: number
  stores: OrderStoreResult[]
}

interface PricedItem {
  storeId: string
  productId?: string
  isCustom: boolean
  customDescription?: string
  unit: ItemUnit
  requestedQty: number
  expectedPrice: number
  expectedTotal: number
}

function isCustomItem(item: CartItemInput): boolean {
  return item.isCustom === true || !item.productId
}

const ITEM_UNIT_VALUES = new Set<string>(Object.values(ItemUnit) as string[])

function toItemUnit(value: string | undefined): ItemUnit {
  const input = (value ?? "PIECE").toUpperCase()
  return (ITEM_UNIT_VALUES.has(input) ? input : "PIECE") as ItemUnit
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// Server is the source of truth for prices: regular items are priced from the DB,
// never from a client-supplied price.
async function resolveItemPrices(
  items: CartItemInput[],
  tx: Prisma.TransactionClient
): Promise<Map<string, number>> {
  const pairs: { storeId: string; productId: string }[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (!isCustomItem(item) && item.productId) {
      const key = `${item.storeId}:${item.productId}`
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push({ storeId: item.storeId, productId: item.productId })
      }
    }
  }
  if (pairs.length === 0) return new Map()

  const storeProducts = await tx.storeProduct.findMany({
    where: {
      OR: pairs.map((p) => ({
        storeId: p.storeId,
        productId: p.productId,
      })),
      isActive: true,
    },
    select: { storeId: true, productId: true, price: true },
  })

  const prices = new Map<string, number>()
  for (const sp of storeProducts) {
    prices.set(`${sp.storeId}:${sp.productId}`, Number(sp.price))
  }
  return prices
}

function validateItems(
  items: CartItemInput[],
  prices: Map<string, number>
): void {
  if (items.length === 0) {
    throw new Error("السلة فارغة")
  }
  for (const item of items) {
    if (!item.storeId) {
      throw new Error("مطلوب storeId لكل عنصر")
    }
    if (item.requestedQty <= 0) {
      throw new Error("requestedQty يجب أن يكون أكبر من الصفر")
    }
    if (isCustomItem(item)) {
      if (!item.customDescription || item.customDescription.trim().length === 0) {
        throw new Error("العنصر المخصص يتطلب customDescription")
      }
      if ((item.expectedPrice ?? 0) < 0) {
        throw new Error("expectedPrice غير صالح")
      }
    } else {
      const price = prices.get(`${item.storeId}:${item.productId!}`)
      if (price === undefined) {
        throw new Error("المنتج غير متاح في هذا المتجر")
      }
    }
  }
}

function computeItemTotals(
  items: CartItemInput[],
  prices: Map<string, number>
): PricedItem[] {
  return items.map((item): PricedItem => {
    const isCustom = isCustomItem(item)
    const expectedPrice = isCustom
      ? Number(item.expectedPrice ?? 0)
      : prices.get(`${item.storeId}:${item.productId!}`)!

    return {
      storeId: item.storeId,
      productId: item.productId,
      isCustom,
      customDescription: item.customDescription,
      unit: toItemUnit(item.unit),
      requestedQty: item.requestedQty,
      expectedPrice,
      expectedTotal: round2(item.requestedQty * expectedPrice),
    }
  })
}

function groupByStore(items: PricedItem[]): Record<string, PricedItem[]> {
  return items.reduce<Record<string, PricedItem[]>>((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = []
    acc[item.storeId].push(item)
    return acc
  }, {})
}

// إنشاء طلب حقيقي: Order + OrderStores + OrderItems + OrderEvent
// يُنشأ في Transaction واحدة (all-or-nothing) مع Idempotency.
export async function createOrder(
  input: CreateOrderInput,
  sessionUserId: string
): Promise<OrderResult> {
  // Idempotency: إذا سبق إنشاءه بنجاح، أعد النتيجة نفسها.
  const cached = await findIdempotentResult(input.idempotencyKey, sessionUserId, "CREATE_ORDER")
  if (cached) return JSON.parse(cached.response) as unknown as OrderResult

  try {
    const result = await prisma.$transaction(async (tx) => {
      // User.id -> CustomerProfile.id (Order.customerId يشير لCustomerProfile)
      const profile = await tx.customerProfile.findUnique({
        where: { userId: sessionUserId },
        select: { id: true },
      })
      if (!profile) {
        throw new Error("الملف الشخصي للعميل غير موجود")
      }
      const customerId = profile.id

      // Authorization على المورع: العنوان يجب أن يخص هذا العميل
      const address = await tx.address.findUnique({
        where: { id: input.addressId },
        select: { customerId: true },
      })
      if (!address) {
        throw new Error("العنوان غير موجود")
      }
      if (address.customerId !== customerId) {
        throw new Error("العنوان غير مرتبط بهذا العميل")
      }

      // حساب الأسعار على الخادم (Server is source of truth)
      const prices = await resolveItemPrices(input.items, tx)
      validateItems(input.items, prices)
      const pricedItems = computeItemTotals(input.items, prices)
      const subtotalExpected = pricedItems.reduce(
        (sum, i) => sum + i.expectedTotal,
        0
      )
      const breakdown = calculatePricing(subtotalExpected)

      const grouped = groupByStore(pricedItems)
      const storeIds = Object.keys(grouped)

      // 1. إنشاء الطلب (DRAFT)
      const order = await tx.order.create({
        data: {
          customer: { connect: { id: customerId } },
          address: { connect: { id: input.addressId } },
          status: OrderStatus.DRAFT,
          subtotalExpected: breakdown.subtotal,
          deliveryFee: breakdown.deliveryFee,
          yallaShare: breakdown.yallaShare,
          courierEarning: breakdown.courierEarning,
          totalExpected: breakdown.total,
        },
      })

      // 2. DRAFT -> PENDING عبر State Machine (Rule 9 & 10)
      assertTransition(OrderStatus.DRAFT, OrderStatus.PENDING)
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PENDING },
      })

      // 3. OrderEvent (CREATED + SUBMITTED)
      await tx.orderEvent.create({
        data: {
          order: { connect: { id: order.id } },
          actorType: "CUSTOMER",
          actorId: sessionUserId,
          event: "CREATED",
          metadata: { idempotencyKey: input.idempotencyKey },
        },
      })
      await tx.orderEvent.create({
        data: {
          order: { connect: { id: order.id } },
          actorType: "CUSTOMER",
          actorId: sessionUserId,
          event: "SUBMITTED",
        },
      })

      // 4. OrderStores + OrderItems (sequential داخل نفس المعاملة = atomic)
      const storeResults: OrderStoreResult[] = []
      for (const storeId of storeIds) {
        const orderStore = await tx.orderStore.create({
          data: {
            order: { connect: { id: order.id } },
            store: { connect: { id: storeId } },
          },
          select: { id: true, store: { select: { id: true } } },
        })

        const itemResults: OrderItemResult[] = []
        for (const item of grouped[storeId]) {
          const created = await tx.orderItem.create({
            data: {
              order: { connect: { id: order.id } },
              orderStore: { connect: { id: orderStore.id } },
              productId: item.productId ?? null,
              isCustom: item.isCustom,
              customDescription: item.customDescription ?? null,
              unit: item.unit,
              requestedQty: item.requestedQty,
              expectedPrice: item.expectedPrice,
              expectedTotal: item.expectedTotal,
            },
          })
          itemResults.push({
            itemId: created.id,
            productId: created.productId,
            isCustom: created.isCustom,
            customDescription: created.customDescription,
            requestedQty: Number(created.requestedQty),
            unit: created.unit,
            expectedPrice: Number(created.expectedPrice),
            expectedTotal: Number(created.expectedTotal),
          })
        }
        storeResults.push({ storeId: orderStore.store.id, items: itemResults })
      }

      const response: OrderResult = {
        orderId: order.id,
        status: OrderStatus.PENDING,
        customerId,
        addressId: input.addressId,
        subtotalExpected: breakdown.subtotal,
        deliveryFee: breakdown.deliveryFee,
        yallaShare: breakdown.yallaShare,
        courierEarning: breakdown.courierEarning,
        totalExpected: breakdown.total,
        stores: storeResults,
      }

      // 5. تسجيل الازدواجية آخر خطوة: P2002 يُلغي المعاملة، ثم يُسترداد.
      await recordIdempotencyResult(
        input.idempotencyKey,
        "CREATE_ORDER",
        order.id,
        response,
        tx,
        sessionUserId
      )

      return response
    })

    return result
  } catch (err) {
    if (isUniqueViolation(err)) {
      // طلب مزامن فاز بالمفتاح: استرجاع النتيجة الملتزمة بعد لحظة.
      for (let attempt = 0; attempt < 6; attempt++) {
        const won = await findIdempotentResult(input.idempotencyKey, sessionUserId, "CREATE_ORDER")
        if (won) return JSON.parse(won.response) as unknown as OrderResult
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
    throw err
  }
}
