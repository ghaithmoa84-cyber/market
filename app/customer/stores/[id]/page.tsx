import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    notFound()
  }

  const now = new Date()
  const currentDay = now.getDay()
  const todayHours = store.hours.find((h) => h.dayOfWeek === currentDay)

  const isOpen = checkIfOpen(todayHours, now)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary">الرئيسية</Link>
        <span>/</span>
        <span className="text-gray-900">{store.name}</span>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">{store.name}</h1>
            <p className="text-gray-600">{store.address}</p>
            {store.phone && <p className="text-gray-600 mt-1">الهاتف: {store.phone}</p>}
          </div>
          <span
            className={`px-4 py-2 rounded-full text-lg font-medium ${
              isOpen
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isOpen ? "مفتوح الآن" : "مغلق الآن"}
          </span>
        </div>

        {todayHours && (
          <div className="mt-4 text-sm text-gray-600">
            {todayHours.isClosed ? (
              <span>مغلق اليوم</span>
            ) : todayHours.opensAt && todayHours.closesAt ? (
              <span>ساعات العمل اليوم: {todayHours.opensAt} - {todayHours.closesAt}</span>
            ) : (
              <span>ساعات العمل غير محددة</span>
            )}
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900">المنتجات</h2>

      {store.products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات"
          description="هذا المتجر لا يحتوي على منتجات حالياً"
          action="/"
          actionLabel="العودة للرئيسية"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {store.products.map((sp) => (
            <div
              key={sp.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <Link href={`/products/${sp.product.id}`}>
                <h2 className="text-xl font-bold text-primary mb-1 hover:underline">
                  {sp.product.name}
                </h2>
              </Link>
              {sp.product.brand && (
                <p className="text-gray-600 text-sm mb-2">العلامة التجارية: {sp.product.brand}</p>
              )}
              <Link
                href={`/categories/${sp.product.categoryId}`}
                className="text-sm text-secondary hover:underline"
              >
                {sp.product.category.name}
              </Link>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">السعر:</span>
                  <span className="text-2xl font-bold text-primary">
                    {Number(sp.price).toLocaleString()}
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

function checkIfOpen(
  todayHours: {
    dayOfWeek: number
    opensAt: string | null
    closesAt: string | null
    isClosed: boolean
  } | undefined,
  now: Date
): boolean {
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
