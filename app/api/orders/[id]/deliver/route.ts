import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { confirmDelivery } from "@/lib/services/delivery-service"
import { ServiceError } from "@/lib/errors"
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
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("[deliver]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
