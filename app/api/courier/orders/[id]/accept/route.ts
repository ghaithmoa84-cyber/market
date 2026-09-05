import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { acceptOrder } from "@/lib/services/courier-service"
import { z } from "zod"

export const dynamic = "force-dynamic"

const acceptOrderSchema = z.object({
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
    const parsed = acceptOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
    }

    const result = await acceptOrder(session.user.id, {
      orderId: id,
      idempotencyKey: parsed.data.idempotencyKey,
    })

    return NextResponse.json({ order: result })
  } catch (err) {
    console.error("Accept order error:", err)
    if (err instanceof Error && err.message === "الطلب غير متاح للقبول") {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
