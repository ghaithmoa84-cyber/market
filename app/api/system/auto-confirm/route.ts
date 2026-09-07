import { NextRequest, NextResponse } from "next/server"
import { checkAndAutoConfirm } from "@/lib/services/delivery-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    await checkAndAutoConfirm()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Check and auto confirm error")
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
