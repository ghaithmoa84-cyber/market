import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { autoConfirm } from "@/lib/services/delivery-service"
import { ServiceError } from "@/lib/errors"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const actual = Buffer.from(authHeader ?? "")
  const isValid =
    expected.length === actual.length && timingSafeEqual(expected, actual)

  if (!isValid) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const { id } = await params
    const order = await autoConfirm(id)
    return NextResponse.json({ success: true, order })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("[auto-confirm]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
