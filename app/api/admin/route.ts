import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAdmin } from "@/lib/server-utils"
import { z } from "zod"

// Create user
const createUserSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "COURIER", "CUSTOMER"]),
  password: z.string().min(6),
  vehicleType: z.string().optional(),
})

// Create store
const createStoreSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional(),
})

// Create category
const createCategorySchema = z.object({
  name: z.string().min(1),
})

// Create product
const createProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  categoryId: z.string(),
})

// Link product to store
const linkProductSchema = z.object({
  storeId: z.string(),
  productId: z.string(),
  price: z.number().min(0),
})

// Update price
const updatePriceSchema = z.object({
  storeProductId: z.string(),
  newPrice: z.number().min(0),
})

// Toggle user active
const toggleUserSchema = z.object({
  userId: z.string(),
  isActive: z.boolean(),
})

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, data } = body
    const changedById = session.user?.id ?? null

    switch (action) {
      case "createUser": {
        const parsed = createUserSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }
        const { phone, name, role, password, vehicleType } = parsed.data

        const bcryptjs = (await import("bcryptjs")).default
        const passwordHash = await bcryptjs.hash(password, 12)

        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              phone,
              name,
              role,
              passwordHash,
            },
            select: {
              id: true,
              phone: true,
              name: true,
              role: true,
              isActive: true,
            },
          })

          if (role === "CUSTOMER") {
            await tx.customerProfile.create({
              data: { userId: user.id },
            })
          }

          if (role === "COURIER") {
            await tx.courierProfile.create({
              data: {
                userId: user.id,
                vehicleType: vehicleType ?? "unknown",
              },
            })
          }

          return user
        })

        return NextResponse.json({ user: result })
      }

      case "toggleUser": {
        const parsed = toggleUserSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }
        const { userId, isActive } = parsed.data

        const updated = await prisma.user.update({
          where: { id: userId },
          data: { isActive },
          select: {
            id: true,
            phone: true,
            name: true,
            role: true,
            isActive: true,
          },
        })

        return NextResponse.json({ user: updated })
      }

      case "createStore": {
        const parsed = createStoreSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }

        const store = await prisma.store.create({
          data: {
            name: parsed.data.name,
            address: parsed.data.address,
            phone: parsed.data.phone,
          },
        })

        return NextResponse.json({ store })
      }

      case "createCategory": {
        const parsed = createCategorySchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }

        const category = await prisma.category.create({
          data: { name: parsed.data.name },
        })

        return NextResponse.json({ category })
      }

      case "createProduct": {
        const parsed = createProductSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }

        const product = await prisma.product.create({
          data: {
            name: parsed.data.name,
            brand: parsed.data.brand,
            category: { connect: { id: parsed.data.categoryId } },
          },
        })

        return NextResponse.json({ product })
      }

      case "linkProduct": {
        const parsed = linkProductSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }

        const storeProduct = await prisma.$transaction(async (tx) => {
          const sp = await tx.storeProduct.create({
            data: {
              store: { connect: { id: parsed.data.storeId } },
              product: { connect: { id: parsed.data.productId } },
              price: parsed.data.price,
            },
          })

          await tx.priceHistory.create({
            data: {
              storeProductId: sp.id,
              price: parsed.data.price,
              changedById,
            },
          })

          return sp
        })

        return NextResponse.json({ storeProduct })
      }

      case "updatePrice": {
        const parsed = updatePriceSchema.safeParse(data)
        if (!parsed.success) {
          return NextResponse.json(
            { error: "بيانات غير صحيحة" },
            { status: 400 }
          )
        }

        const result = await prisma.$transaction(async (tx) => {
          const sp = await tx.storeProduct.update({
            where: { id: parsed.data.storeProductId },
            data: { price: parsed.data.newPrice },
            include: {
              product: true,
              store: true,
            },
          })

          await tx.priceHistory.create({
            data: {
              storeProductId: sp.id,
              price: parsed.data.newPrice,
              changedById,
            },
          })

          return sp
        })

        return NextResponse.json({ storeProduct: result })
      }

      default:
        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 })
    }
  } catch (err) {
    console.error("Admin API error:", err)
    return NextResponse.json(
      { error: "خطأ في الخادم" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const resource = searchParams.get("resource")

    switch (resource) {
      case "users": {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            phone: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({ users })
      }

      case "stores": {
        const stores = await prisma.store.findMany({
          include: {
            products: { include: { product: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({ stores })
      }

      case "categories": {
        const categories = await prisma.category.findMany({
          orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({ categories })
      }

      case "products": {
        const products = await prisma.product.findMany({
          include: { category: true, storeProducts: true },
          orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({ products })
      }

      case "storeProducts": {
        const storeProducts = await prisma.storeProduct.findMany({
          include: {
            store: true,
            product: true,
          },
          orderBy: { createdAt: "desc" },
        })
        return NextResponse.json({ storeProducts })
      }

      case "priceHistory": {
        const storeProductId = searchParams.get("storeProductId")
        if (!storeProductId) {
          return NextResponse.json(
            { error: "storeProductId مطلوب" },
            { status: 400 }
          )
        }
        const history = await prisma.priceHistory.findMany({
          where: { storeProductId },
          orderBy: { recordedAt: "desc" },
        })
        return NextResponse.json({ history })
      }

      case "stats": {
        const [userCount, storeCount, productCount, categoryCount] =
          await Promise.all([
            prisma.user.count(),
            prisma.store.count(),
            prisma.product.count(),
            prisma.category.count(),
          ])
        return NextResponse.json({
          users: userCount,
          stores: storeCount,
          products: productCount,
          categories: categoryCount,
        })
      }

      default:
        return NextResponse.json(
          { error: "حدد resource طلباً" },
          { status: 400 }
        )
    }
  } catch (err) {
    console.error("Admin GET error:", err)
    return NextResponse.json(
      { error: "خطأ في الخادم" },
      { status: 500 }
    )
  }
}
