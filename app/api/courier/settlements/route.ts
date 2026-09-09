import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireCourier } from "@/lib/server-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireCourier()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const profile = await prisma.courierProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 })
    }

    const batches = await prisma.settlementBatch.findMany({
      where: { courierId: profile.id },
      include: {
        items: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ batches })
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Get courier settlements error")
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 })
  }
}
