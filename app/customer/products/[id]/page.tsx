import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    notFound()
  }

  const now = new Date()
  const currentDay = now.getDay()

  const storesWithStatus = product.storeProducts.map((sp) => {
    const isOpen = isStoreOpen(sp.store.hours, currentDay, now)
    return { ...sp, store: { ...sp.store, isOpen } }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/categories" className="hover:text-primary">الفئات</Link>
        <span>/</span>
        <Link href={`/categories/${product.categoryId}`} className="hover:text-primary">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
        {product.brand && (
          <p className="text-gray-600 mb-4">العلامة التجارية: {product.brand}</p>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900">الأسعار حسب المتجر</h2>

      {storesWithStatus.length === 0 ? (
        <EmptyState
          title="لا توجد أسعار متوفرة"
          description="هذا المنتج غير متوفر في أي متجر حالياً"
          action="/categories"
          actionLabel="العودة للفئات"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storesWithStatus.map((sp) => (
            <div
              key={sp.id}
              className={`bg-white rounded-lg shadow p-6 ${!sp.store.isOpen ? "opacity-60" : ""}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link
                    href={`/stores/${sp.store.id}`}
                    className="text-xl font-bold text-primary hover:underline"
                  >
                    {sp.store.name}
                  </Link>
                  <p className="text-gray-600 mt-1">{sp.store.address}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    sp.store.isOpen
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {sp.store.isOpen ? "مفتوح" : "مغلق"}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">السعر:</span>
                  <span className="text-2xl font-bold text-primary">
                    {sp.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  آخر تحديث: {formatDate(sp.updatedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function isStoreOpen(hours: Array<{
  dayOfWeek: number
  opensAt: string | null
  closesAt: string | null
  isClosed: boolean
}>, currentDay: number, now: Date): boolean {
  const todayHours = hours.find((h) => h.dayOfWeek === currentDay)
  if (!todayHours || todayHours.isClosed) return false
  if (!todayHours.opensAt || !todayHours.closesAt) return true

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [openHour, openMin] = todayHours.opensAt.split(":").map(Number)
  const [closeHour, closeMin] = todayHours.closesAt.split(":").map(Number)
  const openMinutes = openHour * 60 + openMin
  const closeMinutes = closeHour * 60 + closeMin

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
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
