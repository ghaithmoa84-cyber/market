import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const resource = searchParams.get("resource")

    switch (resource) {
      case "categories": {
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        })
        return NextResponse.json({ categories })
      }

      case "products": {
        const categoryId = searchParams.get("categoryId")
        const products = await prisma.product.findMany({
          where: {
            isActive: true,
            ...(categoryId ? { categoryId } : {}),
          },
          include: {
            category: true,
            storeProducts: {
              where: { isActive: true },
              include: {
                store: {
                  include: {
                    hours: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        })
        return NextResponse.json({ products })
      }

      case "product": {
        const id = searchParams.get("id")
        if (!id) {
          return NextResponse.json({ error: "id مطلوب" }, { status: 400 })
        }
        const product = await prisma.product.findUnique({
          where: { id, isActive: true },
          include: {
            category: true,
            storeProducts: {
              where: { isActive: true },
              include: {
                store: {
                  include: {
                    hours: true,
                  },
                },
              },
            },
          },
        })
        if (!product) {
          return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 })
        }
        return NextResponse.json({ product })
      }

      case "stores": {
        const stores = await prisma.store.findMany({
          where: { isActive: true },
          include: {
            hours: true,
          },
          orderBy: { name: "asc" },
        })
        return NextResponse.json({ stores })
      }

      case "store": {
        const id = searchParams.get("id")
        if (!id) {
          return NextResponse.json({ error: "id مطلوب" }, { status: 400 })
        }
        const store = await prisma.store.findUnique({
          where: { id, isActive: true },
          include: {
            hours: true,
            products: {
              where: { isActive: true },
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
              orderBy: { product: { name: "asc" } },
            },
          },
        })
        if (!store) {
          return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 })
        }
        return NextResponse.json({ store })
      }

      default:
        return NextResponse.json({ error: "حدد resource طلباً" }, { status: 400 })
    }
  } catch (err) {
    console.error("Customer API error:", err)
    return NextResponse.json(
      { error: "خطأ في الخادم" },
      { status: 500 }
    )
  }
}
