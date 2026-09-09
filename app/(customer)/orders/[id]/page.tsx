"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import config from "@/lib/config"

type Order = {
  id: string
  status: string
  deliveredAt?: string
  address: { addressText: string; deliveryNotes?: string }
  orderStores: {
    id: string
    store: { name: string }
    items: {
      id: string
      productId?: string
      customDescription?: string
      requestedQty: number
      expectedPrice: number
      expectedTotal: number
      unit: string
    }[]
  }[]
  subtotalExpected: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  totalExpected: number
  createdAt: string
  events: { id: string; event: string; actorType: string; createdAt: string }[]
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

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resolved = await params
      const res = await fetch(`/api/orders/${resolved.id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("الطلب غير موجود")
        } else {
          setError("حدث خطأ في تحميل البيانات")
        }
        return
      }
      const data = await res.json()
      setOrder(data.order)
    } catch {
      setError("حدث خطأ في الاتصال")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchOrder()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchOrder])

  useEffect(() => {
    const FINAL_STATUSES = ["SETTLED", "CANCELLED", "CONFIRMED", "SETTLEMENT_PENDING"]
    if (!order) return

    if (FINAL_STATUSES.includes(order.status)) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data.order)
          if (FINAL_STATUSES.includes(data.order.status)) {
            clearInterval(interval)
          }
        }
      } catch {
        // ignore
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [order, fetchOrder])

  const handleConfirm = async () => {
    if (!order) return
    setSubmitting(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "فشل تأكيد الاستلام")
        return
      }
      await fetchOrder()
    } catch {
      setActionError("حدث خطأ في الاتصال")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-600">جار التحميل...</div>
  }

  if (error || !order) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/orders" className="hover:text-primary">
            طلباتي
          </Link>
          <span>/</span>
          <span className="text-gray-900">تفاصيل الطلب</span>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || "الطلب غير موجود"}
        </div>
      </div>
    )
  }

  const isDelivered = order.status === "DELIVERED"
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/orders" className="hover:text-primary">
          طلباتي
        </Link>
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
              }).format(new Date(order.createdAt))}
            </p>
          </div>
        </div>

      {isDelivered && (
        <CountdownAndPoll
          deliveredAt={deliveredAt}
          onConfirm={handleConfirm}
          submitting={submitting}
          actionError={actionError}
        />
      )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">العناصر</h2>
        {order.orderStores.map((orderStore) => (
          <div key={orderStore.id} className="border-b last:border-b-0 pb-4">
            <h3 className="text-lg font-bold text-primary mb-3">
              {orderStore.store.name}
            </h3>
            <div className="space-y-2">
              {orderStore.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.productId
                        ? `منتج #${item.productId.slice(0, 8)}`
                        : item.customDescription || "عنصر مخصص"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Number(item.requestedQty)} ×{" "}
                      {Number(item.expectedPrice).toLocaleString()} ={" "}
                      {Number(item.expectedTotal).toLocaleString()} ل.س
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
              <div
                key={evt.id}
                className="flex items-center justify-between border-b pb-2"
              >
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
                  }).format(new Date(evt.createdAt))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CountdownAndPoll({
  deliveredAt,
  onConfirm,
  submitting,
  actionError,
}: {
  deliveredAt: Date | null
  onConfirm: () => void
  submitting: boolean
  actionError: string | null
}) {
  const [remaining, setRemaining] = useState(() => {
    if (!deliveredAt) return 0
    const elapsed = Math.floor(
      (Date.now() - deliveredAt.getTime()) / (1000 * 60)
    )
    return Math.max(0, config.timeouts.autoConfirmMinutes - elapsed)
  })

  useEffect(() => {
    if (!deliveredAt) return

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor(
        (now.getTime() - deliveredAt.getTime()) / (1000 * 60)
      )
      const left = Math.max(0, config.timeouts.autoConfirmMinutes - elapsed)
      setRemaining(left)

      if (left <= 0) {
        clearInterval(interval)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [deliveredAt])

  if (!deliveredAt) return null

  const now = new Date()
  const elapsed = Math.floor(
    (now.getTime() - deliveredAt.getTime()) / (1000 * 60)
  )
  const shouldAutoConfirm = elapsed >= config.timeouts.autoConfirmMinutes

  return (
    <div className="mt-6 space-y-3">
      {remaining > 0 && !shouldAutoConfirm && (
        <p className="text-sm text-gray-600">
          سيتم التأكيد تلقائياً خلال {remaining} دقيقة
        </p>
      )}
      {shouldAutoConfirm && (
        <p className="text-sm text-secondary">انتهت المهلة</p>
      )}
      <Button
        onClick={onConfirm}
        disabled={submitting}
        className="min-h-[48px]"
      >
        {submitting ? "جاري التأكيد..." : "استلمت"}
      </Button>
      {actionError && (
        <p className="text-red-600 text-sm mt-2">{actionError}</p>
      )}
    </div>
  )
}
