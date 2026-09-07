import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAdmin } from "@/lib/server-utils"
import { createSettlementBatch } from "@/lib/services/finance-service"
import { z } from "zod"

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
    const parsed = z
      .object({
        courierId: z.string().min(1),
        settlementDate: z.string().datetime(),
      })
      .safeParse(body)
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
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Create settlement error")
    if (err instanceof Error) {
      if (err.message === "لا توجد أوامر مستحقة التسوية لهذا المندوب") {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      if (err.message === "تسوية لهذا المندوب في هذا التاريخ موجودة بالفعل") {
        return NextResponse.json({ error: err.message }, { status: 409 })
      }
    }
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
