import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const { id } = await params

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    redirect("/login")
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      customerId: profile.id,
    },
    include: {
      address: true,
      orderStores: {
        include: {
          store: true,
          items: true,
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!order) {
    notFound()
  }

  const statusLabel: Record<string, string> = {
    DRAFT: "مسودة",
    PENDING: "قيد الانتظار",
    SEARCHING_COURIER: "البحث عن مندوب",
    COURIER_ASSIGNED: "تم تعيين مندوب",
    COURIER_ACCEPTED: "قبل المندوب",
    GOING_TO_STORE: "في الطريق للمتجر",
    SHOPPING: "يتم التسوق",
    WAITING_CUSTOMER_APPROVAL: "بانتظار موافقتك",
    PURCHASED: "تم الشراء",
    DELIVERING: "جاري التوصيل",
    DELIVERED: "تم التوصيل",
    CONFIRMED: "مؤكد",
    SETTLEMENT_PENDING: "بانتظار التسوية",
    SETTLED: "تمت التسوية",
    CANCELLED: "ملغي",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/orders" className="hover:text-primary">طلباتي</Link>
        <span>/</span>
        <span className="text-gray-900">تفاصيل الطلب</span>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-primary">
            طلب #{order.id.slice(0, 8)}
          </h1>
          <span className="px-4 py-2 rounded-full text-lg font-medium bg-yellow-100 text-yellow-800">
            {statusLabel[order.status] || order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div>
            <p className="text-sm text-gray-500">العنوان</p>
            <p className="font-medium">{order.address.addressText}</p>
            {order.address.deliveryNotes && (
              <p className="text-sm text-gray-600">{order.address.deliveryNotes}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
            <p className="font-medium">
              {new Intl.DateTimeFormat("ar-SY", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">العناصر</h2>
        {order.orderStores.map((orderStore) => (
          <div key={orderStore.id} className="border-b last:border-b-0 pb-4">
            <h3 className="text-lg font-bold text-primary mb-3">{orderStore.store.name}</h3>
            <div className="space-y-2">
              {orderStore.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.productId ? `منتج #${item.productId.slice(0, 8)}` : (item.customDescription || "عنصر مخصص")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Number(item.requestedQty)} × {Number(item.expectedPrice).toLocaleString()} = {Number(item.expectedTotal).toLocaleString()} ل.س
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">{item.unit}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">ملخص مالي</h2>
        <div className="flex justify-between text-gray-700">
          <span>المجموع الفرعي</span>
          <span>{Number(order.subtotalExpected).toLocaleString()} ل.س</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>أجرة التوصيل</span>
          <span>{Number(order.deliveryFee).toLocaleString()} ل.س</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>مشاركة يلا</span>
          <span>{Number(order.yallaShare).toLocaleString()} ل.س</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>أرباح المندوب</span>
          <span>{Number(order.courierEarning).toLocaleString()} ل.س</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t">
          <span>الإجمالي</span>
          <span>{Number(order.totalExpected).toLocaleString()} ل.س</span>
        </div>
      </div>

      {order.events.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">الأحداث</h2>
          <div className="space-y-3">
            {order.events.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium text-gray-900">{evt.event}</p>
                  <p className="text-sm text-gray-600">
                    {evt.actorType === "CUSTOMER" && "العميل"}
                    {evt.actorType === "COURIER" && "المندوب"}
                    {evt.actorType === "ADMIN" && "المدير"}
                    {evt.actorType === "SYSTEM" && "النظام"}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Intl.DateTimeFormat("ar-SY", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(evt.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
