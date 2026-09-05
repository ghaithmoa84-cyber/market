import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  if (session.user.role !== "COURIER") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const { id } = await params

    const profile = await prisma.courierProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        courierId: profile.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            user: {
              select: { name: true },
            },
          },
        },
        address: true,
        orderStores: {
          include: {
            store: true,
            items: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 })
    }

    const formattedOrder = {
      ...order,
      customer: {
        id: order.customer.id,
        name: (order.customer as { user?: { name: string } }).user?.name ?? "",
      },
    }

    return NextResponse.json({ order: formattedOrder }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("Courier order detail error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
