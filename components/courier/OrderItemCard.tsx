"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface OrderItemCardProps {
  item: {
    id: string
    productId: string | null
    isCustom: boolean
    customDescription: string | null
    unit: string
    requestedQty: number
    expectedPrice: number
    expectedTotal: number
    status: string
    actualQty: number | null
    actualPrice: number | null
    actualTotal: number | null
  }
  orderId: string
  onUpdate: () => void
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  PURCHASED: "تم الشراء",
  UNAVAILABLE: "غير متوفر",
  SUBSTITUTED: "مستبدل",
  CANCELLED: "ملغي",
}

export default function OrderItemCard({ item, orderId, onUpdate }: OrderItemCardProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showActualForm, setShowActualForm] = useState(false)
  const [showAltForm, setShowAltForm] = useState(false)
  const [actualQty, setActualQty] = useState(String(item.requestedQty))
  const [actualPrice, setActualPrice] = useState("")
  const [altDescription, setAltDescription] = useState("")
  const [altPrice, setAltPrice] = useState("")
  const [actualIdempotencyKey, setActualIdempotencyKey] = useState(() => crypto.randomUUID())
  const [altIdempotencyKey, setAltIdempotencyKey] = useState(() => crypto.randomUUID())

  const resetForms = () => {
    setShowActualForm(false)
    setShowAltForm(false)
    setActualQty(String(item.requestedQty))
    setActualPrice("")
    setAltDescription("")
    setAltPrice("")
    setActualIdempotencyKey(crypto.randomUUID())
    setAltIdempotencyKey(crypto.randomUUID())
    setError("")
  }

  const handleMarkActual = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}/actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualQty: Number(actualQty),
          actualPrice: Number(actualPrice),
          idempotencyKey: actualIdempotencyKey,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "فشل تسجيل العنصر")
      }
      resetForms()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال")
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkUnavailable = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}/unavailable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "فشل تحديث الحالة")
      }
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال")
    } finally {
      setSubmitting(false)
    }
  }

  const handleProposeAlternative = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}/alternatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: altDescription,
          price: Number(altPrice),
          idempotencyKey: altIdempotencyKey,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "فشل اقتراح البديل")
      }
      resetForms()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال")
    } finally {
      setSubmitting(false)
    }
  }

  const isReadOnly = item.status === "PURCHASED" || item.status === "SUBSTITUTED"

  return (
    <div className="border rounded-lg p-4 space-y-3" dir="rtl">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {item.productId ? `منتج #${item.productId.slice(0, 8)}` : (item.customDescription || "عنصر مخصص")}
          </p>
          <p className="text-sm text-gray-600">
            {Number(item.requestedQty)} × {Number(item.expectedPrice).toLocaleString()} = {Number(item.expectedTotal).toLocaleString()} ل.س
          </p>
          <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {STATUS_LABELS[item.status] || item.status}
          </span>
        </div>
        <span className="text-sm text-gray-500 mr-4">{item.unit}</span>
      </div>

      {isReadOnly && item.actualQty !== null && item.actualPrice !== null && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
          <p>الكمية الفعلية: {Number(item.actualQty)}</p>
          <p>السعر الفعلي: {Number(item.actualPrice).toLocaleString()} ل.س</p>
          {item.actualTotal !== null && (
            <p>الإجمالي الفعلي: {Number(item.actualTotal).toLocaleString()} ل.س</p>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isReadOnly && (
        <div className="flex flex-wrap gap-2">
          {item.status === "PENDING" && (
            <>
              {!showActualForm ? (
                <Button
                  onClick={() => setShowActualForm(true)}
                  disabled={submitting}
                  className="min-h-[48px]"
                >
                  تم الشراء
                </Button>
              ) : (
                <Button
                  onClick={() => setShowActualForm(false)}
                  variant="outline"
                  disabled={submitting}
                  className="min-h-[48px]"
                >
                  إلغاء
                </Button>
              )}
              <Button
                onClick={handleMarkUnavailable}
                disabled={submitting}
                variant="outline"
                className="min-h-[48px]"
              >
                غير متوفر
              </Button>
            </>
          )}

          {item.status === "UNAVAILABLE" && (
            <>
              {!showAltForm ? (
                <Button
                  onClick={() => setShowAltForm(true)}
                  disabled={submitting}
                  className="min-h-[48px]"
                >
                  اقتراح بديل
                </Button>
              ) : (
                <Button
                  onClick={() => setShowAltForm(false)}
                  variant="outline"
                  disabled={submitting}
                  className="min-h-[48px]"
                >
                  إلغاء
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {showActualForm && (
        <div className="border-t pt-3 space-y-3" dir="rtl">
          <p className="font-medium text-gray-900">تسجيل الشراء</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الفعلية</label>
            <input
              type="number"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[48px] text-base"
              step="any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">السعر الفعلي (ل.س)</label>
            <input
              type="number"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[48px] text-base"
              step="any"
            />
          </div>
          <Button
            onClick={handleMarkActual}
            disabled={submitting || !actualPrice}
            className="min-h-[48px]"
          >
            {submitting ? "جاري الإرسال..." : "تأكيد"}
          </Button>
        </div>
      )}

      {showAltForm && (
        <div className="border-t pt-3 space-y-3" dir="rtl">
          <p className="font-medium text-gray-900">اقتراح بديل</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وصف البديل</label>
            <input
              type="text"
              value={altDescription}
              onChange={(e) => setAltDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[48px] text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">السعر (ل.س)</label>
            <input
              type="number"
              value={altPrice}
              onChange={(e) => setAltPrice(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[48px] text-base"
              step="any"
            />
          </div>
          <Button
            onClick={handleProposeAlternative}
            disabled={submitting || altDescription.length < 3 || !altPrice}
            className="min-h-[48px]"
          >
            {submitting ? "جاري الإرسال..." : "إرسال الاقتراح"}
          </Button>
        </div>
      )}
    </div>
  )
}
