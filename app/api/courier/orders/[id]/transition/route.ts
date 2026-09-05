import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { transitionOrderStatus } from "@/lib/services/courier-service"
import { z } from "zod"
import { OrderStatus } from "@prisma/client"

export const dynamic = "force-dynamic"

const transitionSchema = z.object({
  to: z.enum([
    OrderStatus.COURIER_ACCEPTED,
    OrderStatus.GOING_TO_STORE,
    OrderStatus.SHOPPING,
  ]),
  idempotencyKey: z.string().min(1, "مطلوب idempotencyKey"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  if (session.user.role !== "COURIER") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = transitionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
    }

    const result = await transitionOrderStatus(session.user.id, {
      orderId: id,
      to: parsed.data.to,
      idempotencyKey: parsed.data.idempotencyKey,
    })

    return NextResponse.json({ order: result })
  } catch (err) {
    console.error("Transition error:", err)
    if (err instanceof Error) {
      if (
        err.message.includes("الطلب غير موجود") ||
        err.message.includes("غير مسند")
      ) {
        return NextResponse.json({ error: err.message }, { status: 404 })
      }
      if (err.message.includes("Transition invalide")) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
