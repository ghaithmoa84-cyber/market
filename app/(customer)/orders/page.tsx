import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    redirect("/login")
  }

  const orders = await prisma.order.findMany({
    where: { customerId: profile.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalExpected: true,
      createdAt: true,
      orderStores: {
        select: {
          store: {
            select: { name: true },
          },
        },
      },
    },
  })

  const statusConfig: Record<string, { label: string; color: string }> = {
    DELIVERED: { label: "مكتمل", color: "bg-green-100 text-green-800" },
    CONFIRMED: { label: "مكتمل", color: "bg-green-100 text-green-800" },
    SETTLED: { label: "مكتمل", color: "bg-green-100 text-green-800" },
    CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-800" },
    PENDING: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    SEARCHING_COURIER: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    COURIER_ASSIGNED: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    COURIER_ACCEPTED: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    GOING_TO_STORE: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    SHOPPING: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    WAITING_CUSTOMER_APPROVAL: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    PURCHASED: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    DELIVERING: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
    SETTLEMENT_PENDING: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-800" },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">طلباتي</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">لا توجد طلبات</h2>
          <p className="text-gray-600 mb-4">ابدأ بتسوق الآن</p>
          <Link
            href="/categories"
            className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors min-h-[48px]"
          >
            تصفح الفئات
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" }
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      طلب #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Intl.DateTimeFormat("ar-SY", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(order.createdAt)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.orderStores.map((os) => os.store.name).join("، ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <p className="text-lg font-bold text-primary mt-2">
                      {Number(order.totalExpected).toLocaleString()} ل.س
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
