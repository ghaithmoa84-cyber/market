import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createAddressSchema } from "@/lib/validations/order"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 })
    }

    const addresses = await prisma.address.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ addresses })
  } catch (err) {
    console.error("Addresses GET error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 })
  }

  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createAddressSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 })
    }

    const { label, addressText, lat, lng, deliveryNotes, isDefault } = parsed.data

    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: profile.id },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.create({
      data: {
        customerId: profile.id,
        label,
        addressText,
        lat,
        lng,
        deliveryNotes,
        isDefault: isDefault ?? false,
      },
    })

    return NextResponse.json({ address })
  } catch (err) {
    console.error("Addresses POST error:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}
