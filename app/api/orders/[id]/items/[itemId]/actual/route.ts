import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceError } from "@/lib/errors"
import { actualItemSchema } from "@/lib/validations/sprint5"
import { recordActualItem } from "@/lib/services/pricing-service"

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
    if (session.user.role !== "COURIER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 })
    }

    const { id, itemId } = await params

    const body = await request.json()
    const parsed = actualItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await recordActualItem(
      id,
      itemId,
      session.user.id as string,
      parsed.data
    )

    return NextResponse.json({
      success: true,
      item: result,
      requiresApproval: result.requiresApproval,
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[orders/items/actual]", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    )
  }
}
