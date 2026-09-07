import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireAdmin } from "@/lib/server-utils"
import { markSettled } from "@/lib/services/finance-service"
import { ServiceError } from "@/lib/errors"
import { z } from "zod"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = z
      .object({
        amountSettled: z.number().positive().max(999999999999.99),
        idempotencyKey: z.string().min(1),
      })
      .safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    const amount = new Prisma.Decimal(parsed.data.amountSettled)
    const batch = await markSettled(id, session.user.id, amount, parsed.data.idempotencyKey)
    return NextResponse.json({ success: true, batch })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[settlements/mark-settled]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
