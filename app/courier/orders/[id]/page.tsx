"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { transitionOrderStatus } from "@/lib/services/courier-service"

interface OrderEvent {
  id: string
  event: string
  actorType: string
  createdAt: Date
}

interface OrderDetail {
  id: string
  status: string
  subtotalExpected: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  totalExpected: number
  noCourierAt: Date | null
  createdAt: Date
  customer: { id: string; name: string }
  address: {
    id: string
    addressText: string
    lat: number | null
    lng: number | null
    deliveryNotes: string | null
  }
  orderStores: {
    id: string
    store: { id: string; name: string; address: string }
    items: {
      id: string
      productId: string | null
      isCustom: boolean
      customDescription: string | null
      unit: string
      requestedQty: number
      expectedPrice: number
      expectedTotal: number
    }[]
  }[]
  events: OrderEvent[]
}

type TransitionTarget = "COURIER_ACCEPTED" | "GOING_TO_STORE" | "SHOPPING"

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  CANCELLED: "bg-red-100 text-red-800",
  DELIVERED: "bg-green-100 text-green-800",
  CONFIRMED: "bg-green-100 text-green-800",
  SETTLED: "bg-green-100 text-green-800",
  SHOPPING: "bg-yellow-100 text-yellow-800",
  GOING_TO_STORE: "bg-yellow-100 text-yellow-800",
  COURIER_ACCEPTED: "bg-yellow-100 text-yellow-800",
  COURIER_ASSIGNED: "bg-yellow-100 text-yellow-800",
  SEARCHING_COURIER: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-yellow-100 text-yellow-800",
}

const AVAILABLE_TRANSITIONS: Record<string, { to: TransitionTarget; label: string }[]> = {
  [""]: [
    { to: "GOING_TO_STORE", label: "بدء الذهاب للمتجر" },
  ],
  COURIER_ASSIGNED: [
    { to: "GOING_TO_STORE", label: "بدء الذهاب للمتجر" },
  ],
  GOING_TO_STORE: [
    { to: "SHOPPING", label: "بدء التسوق" },
  ],
}

export default function CourierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [transitioning, setTransitioning] = useState(false)
  const [orderId, setOrderId] = useState("")

  useEffect(() => {
    params.then((p) => setOrderId(p.id))
  }, [params])

  useEffect(() => {
    if (!orderId) return

    async function load() {
      try {
        const res = await fetch(`/api/courier/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data.order)
        } else {
          setError("الطلب غير موجود")
        }
      } catch {
        setError("خطأ في الاتصال")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [orderId])

  const handleTransition = async (to: TransitionTarget) => {
    if (!order) return
    setTransitioning(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch(`/api/courier/orders/${order.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ to, idempotencyKey }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrder((prev) => (prev ? { ...prev, status: data.order.status } : prev))
      } else {
        const data = await res.json()
        setError(data.error || "فشل تحديث الحالة")
      }
    } catch {
      setError("خطأ في الاتصال")
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">جاري التحميل...</div>
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "الطلب غير موجود"}</p>
        <Link href="/courier/orders">
          <Button variant="outline" className="min-h-[48px]">العودة للقائمة</Button>
        </Link>
      </div>
    )
  }

  const availableTransitions = AVAILABLE_TRANSITIONS[order.status] ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/courier/orders" className="hover:text-primary">الطلبات المتاحة</Link>
        <span>/</span>
        <span className="text-gray-900">تفاصيل الطلب</span>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-primary">
            طلب #{order.id.slice(0, 8)}
          </h1>
          <span className={`px-4 py-2 rounded-full text-lg font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div>
            <p className="text-sm text-gray-500">العميل</p>
            <p className="font-medium">{order.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">العنوان</p>
            <p className="font-medium">{order.address.addressText}</p>
            {order.address.deliveryNotes && (
              <p className="text-sm text-yellow-700">ملاحظات: {order.address.deliveryNotes}</p>
            )}
            {order.address.lat !== null && order.address.lng !== null && (
              <p className="text-sm text-gray-500">
                الإحداثيات: {order.address.lat}, {order.address.lng}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
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
          <span className="text-green-700 font-bold">{Number(order.courierEarning).toLocaleString()} ل.س</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t">
          <span>الإجمالي</span>
          <span>{Number(order.totalExpected).toLocaleString()} ل.س</span>
        </div>
      </div>

      {availableTransitions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">إجراءات</h2>
          <div className="flex flex-wrap gap-3">
            {availableTransitions.map((t) => (
              <Button
                key={t.to}
                onClick={() => handleTransition(t.to)}
                disabled={transitioning}
                className="min-h-[48px]"
              >
                {transitioning ? "جاري التحديث..." : t.label}
              </Button>
            ))}
          </div>
        </div>
      )}

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
