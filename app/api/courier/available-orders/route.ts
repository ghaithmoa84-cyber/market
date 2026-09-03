import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAvailableOrders } from "@/lib/services/courier-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  if (session.user.role !== "COURIER") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    if (!session.user.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
    }

    const orders = await getAvailableOrders(session.user.id)

    return NextResponse.json({ orders })
  } catch (err) {
    console.error("Available orders error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
