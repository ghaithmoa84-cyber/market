import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { confirmDelivery } from "@/lib/services/delivery-service"
import { z } from "zod"

export const dynamic = "force-dynamic"

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

  const profile = await prisma.courierProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "ملف المندوب غير موجود" }, { status: 404 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = z.object({ idempotencyKey: z.string().min(1) }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    const order = await confirmDelivery(id, profile.id, parsed.data.idempotencyKey)
    return NextResponse.json({ success: true, order })
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Confirm delivery error")
    if (err instanceof Error) {
      if (err.message === "الطلب غير مسند لهذا المندوب") {
        return NextResponse.json({ error: err.message }, { status: 403 })
      }
      if (err.message === "الطلب ليس في حالة توصيل نشطة") {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
