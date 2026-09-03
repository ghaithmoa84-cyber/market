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
    const q = searchParams.get("q")

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ results: [] })
    }

    const query = q.trim()
    const searchTerm = query.toLowerCase()

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { brand: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        category: true,
        storeProducts: {
          where: { isActive: true },
          include: {
            store: true,
          },
        },
      },
      take: 20,
    })

    const results = products.map((product) => ({
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: { name: product.category.name },
      },
      storeProducts: product.storeProducts.map((sp) => ({
        id: sp.id,
        price: Number(sp.price),
        updatedAt: sp.updatedAt.toISOString(),
        store: {
          id: sp.store.id,
          name: sp.store.name,
          address: sp.store.address,
        },
      })),
    }))

    const resultsCount = results.length
    const foundMatch = resultsCount > 0

    await prisma.searchLog.create({
      data: {
        query,
        resultsCount,
        foundMatch,
      },
    })

    return NextResponse.json({ results })
  } catch (err) {
    console.error("Search API error:", err)
    return NextResponse.json(
      { error: "خطأ في البحث" },
      { status: 500 }
    )
  }
}
