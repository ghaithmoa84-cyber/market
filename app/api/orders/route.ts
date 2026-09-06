import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createOrderSchema } from "@/lib/validations/order"
import { createOrder } from "@/lib/services/order-service"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 })
    }

    const orders = await prisma.order.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        orderStores: {
          include: {
            store: true,
            items: true,
          },
        },
      },
    })

    return NextResponse.json({ orders })
  } catch (err) {
    console.error("Orders GET error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    const idempotencyKey = request.headers.get("x-idempotency-key")
    if (!idempotencyKey) {
      return NextResponse.json({ error: "X-Idempotency-Key مطلوب" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = createOrderSchema.safeParse({
      ...body,
      idempotencyKey,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
    }

    const result = await createOrder(parsed.data, session.user.id)

    return NextResponse.json({ order: result }, { status: 201 })
  } catch (err) {
    console.error("Order creation error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
