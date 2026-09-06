"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export interface ApprovalCardProps {
  type: "ALTERNATIVE" | "PRICE_CHANGE"
  orderId: string
  itemId: string
  altId?: string
  data: {
    description?: string
    proposedPrice?: number
    expectedPrice?: number
    actualPrice?: number
  }
  onRespond: () => void
}

export default function ApprovalCard({ type, orderId, itemId, altId, data, onRespond }: ApprovalCardProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  const handleRespond = async (d: "APPROVE" | "REJECT") => {
    setDecision(d)
    setSubmitting(true)
    setError("")
    try {
      const url =
        type === "ALTERNATIVE"
          ? `/api/orders/${orderId}/alternatives/${altId}/respond`
          : `/api/orders/${orderId}/items/${itemId}/price-approval/respond`

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: d,
          idempotencyKey: idempotencyKey,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "فشلت العملية")
      }
      onRespond()
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الاتصال")
    } finally {
      setSubmitting(false)
      setDecision(null)
      setIdempotencyKey(crypto.randomUUID())
    }
  }

  const priceChangePercent = data.expectedPrice && data.actualPrice
    ? Math.abs(((data.actualPrice - data.expectedPrice) / data.expectedPrice) * 100)
    : null

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-yellow-50" dir="rtl">
      {type === "ALTERNATIVE" && (
        <>
          <p className="font-medium text-gray-900">المندوب يقترح بديلاً:</p>
          <p className="text-gray-700">{data.description}</p>
          <p className="text-sm text-gray-600">
            السعر المقترح: {Number(data.proposedPrice).toLocaleString()} ل.س
          </p>
        </>
      )}

      {type === "PRICE_CHANGE" && (
        <>
          <p className="font-medium text-gray-900">السعر تغيّر:</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p>السعر المتوقع: {Number(data.expectedPrice).toLocaleString()} ل.س</p>
            <p>السعر الفعلي: {Number(data.actualPrice).toLocaleString()} ل.س</p>
            {priceChangePercent !== null && (
              <p>نسبة التغيير: {priceChangePercent.toFixed(1)}%</p>
            )}
          </div>
        </>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button
          onClick={() => handleRespond("APPROVE")}
          disabled={submitting}
          className="min-h-[48px]"
        >
          {submitting && decision === "APPROVE" ? "جاري الإرسال..." : "موافق"}
        </Button>
        <Button
          onClick={() => handleRespond("REJECT")}
          disabled={submitting}
          variant="outline"
          className="min-h-[48px]"
        >
          {submitting && decision === "REJECT" ? "جاري الإرسال..." : "رفض"}
        </Button>
      </div>
    </div>
  )
}
