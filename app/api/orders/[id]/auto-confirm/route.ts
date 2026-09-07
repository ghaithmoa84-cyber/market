import { NextRequest, NextResponse } from "next/server"
import { autoConfirm } from "@/lib/services/delivery-service"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    const { id } = await params
    const order = await autoConfirm(id)
    return NextResponse.json({ success: true, order })
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Auto confirm error")
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
