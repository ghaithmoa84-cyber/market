"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface OrderItem {
  id: string
  productId: string | null
  isCustom: boolean
  customDescription: string | null
  unit: string
  requestedQty: number
  expectedPrice: number
  expectedTotal: number
}

interface OrderStore {
  id: string
  store: {
    id: string
    name: string
    address: string
  }
  items: OrderItem[]
}

interface AvailableOrder {
  id: string
  status: string
  subtotalExpected: number
  deliveryFee: number
  yallaShare: number
  courierEarning: number
  totalExpected: number
  noCourierAt: string | null
  createdAt: string
  customer: {
    id: string
    name: string
  }
  address: {
    id: string
    addressText: string
    lat: number | null
    lng: number | null
    deliveryNotes: string | null
  }
  orderStores: OrderStore[]
}

export default function CourierOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<AvailableOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/courier/available-orders")
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders ?? [])
        setError("")
      } else {
        const data = await res.json()
        setError(data.error || "فشل جلب الطلبات")
      }
    } catch {
      setError("خطأ في الاتصال")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchOrders()
    }, 0)
    const interval = setInterval(fetchOrders, 10000)
    return () => {
      clearTimeout(id)
      clearInterval(interval)
    }
  }, [fetchOrders])

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId)
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch(`/api/courier/orders/${orderId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.order) {
          router.push(`/courier/orders/${data.order.orderId}`)
        }
      } else {
        const data = await res.json()
        setError(data.error || "فشل قبول الطلب")
        setAcceptingId(null)
      }
    } catch {
      setError("خطأ في الاتصال")
      setAcceptingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">الطلبات المتاحة</h1>

      {error && <p className="text-red-600 text-center">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-gray-600">جاري التحميل...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">لا توجد طلبات متاحة</h2>
          <p className="text-gray-600">سيظهر هنا الطلبات الجديدة تلقائياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isAccepting = acceptingId === order.id
            return (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      طلب #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-600">
                      العميل: {order.customer.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      العنوان: {order.address.addressText}
                    </p>
                    {order.address.deliveryNotes && (
                      <p className="text-sm text-yellow-700 mt-1">
                        ملاحظات: {order.address.deliveryNotes}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {new Intl.DateTimeFormat("ar-SY", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-primary">
                      {Number(order.totalExpected).toLocaleString()} ل.س
                    </p>
                    <p className="text-sm text-gray-600">
                      أرباحك: {Number(order.courierEarning).toLocaleString()} ل.س
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 mb-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">المتاجر:</p>
                  {order.orderStores.map((os) => (
                    <div key={os.id} className="text-sm text-gray-600 mr-4">
                      <span className="font-medium">{os.store.name}</span>
                      <span className="mr-2">({os.items.length} عناصر)</span>
                    </div>
                  ))}
                </div>

                <Link href={`/courier/orders/${order.id}`}>
                  <Button variant="outline" className="min-h-[48px] mr-2">
                    التفاصيل
                  </Button>
                </Link>
                <Button
                  onClick={() => handleAccept(order.id)}
                  disabled={isAccepting}
                  className="min-h-[48px]"
                >
                  {isAccepting ? "جاري القبول..." : "قبول الطلب"}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
