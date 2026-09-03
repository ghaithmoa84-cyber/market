import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CategoryBrowsePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        include: {
          storeProducts: {
            where: { isActive: true },
            include: {
              store: true,
            },
          },
        },
      },
    },
  })

  if (!category) {
    notFound()
  }

  const products = category.products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    storeProducts: product.storeProducts.map((sp) => ({
      id: sp.id,
      price: Number(sp.price),
      updatedAt: sp.updatedAt,
      store: {
        id: sp.store.id,
        name: sp.store.name,
        address: sp.store.address,
      },
    })),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/categories" className="hover:text-primary">الفئات</Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </div>

      <h1 className="text-3xl font-bold text-primary">{category.name}</h1>

      {products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات في هذه الفئة"
          description="لم يتم إضافة أي منتجات بعد"
          action="/categories"
          actionLabel="العودة للفئات"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
}: {
  product: {
    id: string
    name: string
    brand?: string | null
    storeProducts: Array<{
      id: string
      price: number
      updatedAt: Date
      store: {
        id: string
        name: string
        address: string
      }
    }>
  }
}) {
  const cheapest = product.storeProducts.reduce((min, sp) =>
    sp.price < min.price ? sp : min, product.storeProducts[0])

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow block"
    >
      <h2 className="text-xl font-bold text-primary mb-2">{product.name}</h2>
      {product.brand && (
        <p className="text-gray-600 mb-2">العلامة التجارية: {product.brand}</p>
      )}
      <div className="space-y-2 mt-4">
        {product.storeProducts.map((sp) => (
          <div
            key={sp.id}
            className={`p-3 rounded-md ${sp.id === cheapest.id ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{sp.store.name}</span>
              <span className="text-lg font-bold text-primary">{sp.price.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              آخر تحديث: {formatDate(sp.updatedAt)}
            </p>
          </div>
        ))}
      </div>
    </Link>
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function EmptyState({
  title,
  description,
  action,
  actionLabel,
}: {
  title: string
  description: string
  action: string
  actionLabel: string
}) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <a
        href={action}
        className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors min-h-[48px]"
      >
        {actionLabel}
      </a>
    </div>
  )
}
