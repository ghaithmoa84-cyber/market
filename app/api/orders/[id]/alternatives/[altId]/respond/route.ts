import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ServiceError } from "@/lib/errors"
import { alternativeResponseSchema } from "@/lib/validations/sprint5"
import { respondToAlternative } from "@/lib/services/alternative-service"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; altId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.isActive) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }
    if (session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 })
    }

    const { altId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "طلب غير صالح — تعذّر قراءة البيانات" },
        { status: 400 }
      )
    }

    const parsed = alternativeResponseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await respondToAlternative(
      altId,
      session.user.id as string,
      parsed.data
    )

    return NextResponse.json({ success: true, alternative: result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[alternatives/respond]", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    )
  }
}
