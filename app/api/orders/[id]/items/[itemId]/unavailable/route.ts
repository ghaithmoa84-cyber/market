import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceError } from "@/lib/errors"
import { markItemUnavailable } from "@/lib/services/alternative-service"

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

    const result = await markItemUnavailable(
      id,
      itemId,
      session.user.id as string
    )

    return NextResponse.json({ success: true, item: result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[orders/items/unavailable]", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    )
  }
}
