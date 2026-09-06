import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceError } from "@/lib/errors"
import { priceApprovalResponseSchema } from "@/lib/validations/sprint5"
import { respondToPriceApproval } from "@/lib/services/pricing-service"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.isActive) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }
    if (session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 })
    }

    const { id, itemId } = await params

    const body = await request.json()
    const parsed = priceApprovalResponseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await respondToPriceApproval(
      id,
      itemId,
      session.user.id as string,
      parsed.data
    )

    return NextResponse.json({ success: true, item: result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[price-approval/respond]", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    )
  }
}
