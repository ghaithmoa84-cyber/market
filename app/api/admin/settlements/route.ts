import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAdmin } from "@/lib/server-utils"
import { createSettlementBatch } from "@/lib/services/finance-service"
import { ServiceError } from "@/lib/errors"
import { createSettlementSchema } from "@/lib/validations/sprint6"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const batches = await prisma.settlementBatch.findMany({
      include: {
        courier: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ batches })
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Get settlements error")
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    const date = new Date(parsed.data.settlementDate)
    const batch = await createSettlementBatch(
      parsed.data.courierId,
      date,
      session.user.id
    )
    return NextResponse.json({ success: true, batch })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[settlements-create]", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
