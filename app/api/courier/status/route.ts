import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateCourierStatus } from "@/lib/services/courier-service"
import { z } from "zod"

export const dynamic = "force-dynamic"

const courierStatusSchema = z.object({
  status: z.enum(["OFFLINE", "AVAILABLE"]),
})

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  if (session.user.role !== "COURIER") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = courierStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    if (!session.user.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
    }

    await updateCourierStatus(session.user.id, parsed.data)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Courier status update error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
