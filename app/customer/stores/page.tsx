import prisma from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StoresPage() {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    include: {
      hours: true,
      products: {
        where: { isActive: true },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const now = new Date()
  const currentDay = now.getDay()

  const storesWithStatus = stores.map((store) => {
    const todayHours = store.hours.find((h) => h.dayOfWeek === currentDay)
    const isOpen = checkIfOpen(todayHours, now)
    return { ...store, isOpen, productCount: store.products.length }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">المتاجر</h1>

      {storesWithStatus.length === 0 ? (
        <EmptyState
          title="لا توجد متاجر"
          description="لم يتم إنشاء أي متاجر بعد"
          action="/"
          actionLabel="العودة للرئيسية"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storesWithStatus.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow block ${!store.isOpen ? "opacity-60" : ""}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-primary">{store.name}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    store.isOpen
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {store.isOpen ? "مفتوح" : "مغلق"}
                </span>
              </div>
              <p className="text-gray-600">{store.address}</p>
              {store.phone && <p className="text-gray-600 mt-1">الهاتف: {store.phone}</p>}
              <p className="text-sm text-gray-500 mt-2">
                {store.productCount} منتج
              </p>
            </Link>
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
