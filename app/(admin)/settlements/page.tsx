"use client"

import { useEffect, useState, useCallback } from "react"
import { Button, Input, Label } from "@/components/ui/button"

type Courier = {
  id: string
  name: string
  phone: string
  isActive: boolean
  courierProfile?: { id: string }
}

type SettlementBatch = {
  id: string
  courierId: string
  courier: {
    id: string
    user: {
      id: string
      name: string
      phone: string
    }
  }
  settlementDate: string
  totalDeliveryFees: string
  totalYallaShare: string
  totalCourierEarnings: string
  amountDue: string
  amountSettled: string
  status: string
  settledAt?: string
  createdAt: string
}

export default function AdminSettlementsPage() {
  const [batches, setBatches] = useState<SettlementBatch[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createCourierId, setCreateCourierId] = useState("")
  const [settlementDate, setSettlementDate] = useState("")
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [settleAmount, setSettleAmount] = useState("")
  const [settleSubmitting, setSettleSubmitting] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)
  const [settleBatchId, setSettleBatchId] = useState<string | null>(null)

  const openSettlementForm = (batch: SettlementBatch) => {
    setSettleBatchId(batch.id)
    const remaining = Number(batch.amountDue) - Number(batch.amountSettled || 0)
    setSettleAmount(remaining > 0 ? String(remaining) : "")
    setSettleError(null)
  }

  const fetchSettlements = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/settlements")
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      } else {
        setError("فشل تحميل التسويات")
      }
    } catch {
      setError("حدث خطأ في الاتصال")
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  const fetchCouriers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?resource=couriers")
      if (res.ok) {
        const data = await res.json()
        setCouriers(data.couriers || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchSettlements(true)
      fetchCouriers()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchSettlements, fetchCouriers])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSettlements(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchSettlements])

  const handleCreate = async (e: React.MouseEvent) => {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    if (!createCourierId || !settlementDate) {
      setCreateError("الرجاء ملء جميع الحقول")
      setCreateSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: createCourierId,
          settlementDate: new Date(settlementDate).toISOString(),
        }),
      })

      if (res.ok) {
        setCreateCourierId("")
        setSettlementDate("")
        setShowCreateForm(false)
        fetchSettlements()
      } else {
        const data = await res.json()
        setCreateError(data.error || "فشل إنشاء التسوية")
      }
    } catch {
      setCreateError("حدث خطأ في الاتصال")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleMarkSettled = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!settleBatchId) return
    setSettleSubmitting(true)
    setSettleError(null)

    const amount = Number(settleAmount)
    if (!amount || amount <= 0) {
      setSettleError("أدخل مبلغاً صحيحاً")
      setSettleSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/settlements/${settleBatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountSettled: amount,
          idempotencyKey: crypto.randomUUID(),
        }),
      })

      if (res.ok) {
        setSettleAmount("")
        setSettleBatchId(null)
        fetchSettlements()
      } else {
        const data = await res.json()
        setSettleError(data.error || "فشل تحديث التسوية")
      }
    } catch {
      setSettleError("حدث خطأ في الاتصال")
    } finally {
      setSettleSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    return Number(value).toLocaleString() + " ل.س"
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("ar-SY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr))
  }

  const statusLabel: Record<string, string> = {
    PENDING: "معلق",
    PARTIAL: "مدفوع جزئياً",
    SETTLED: "مسوّى",
  }

  if (loading) {
    return <div className="p-6 text-gray-600">جاري التحميل...</div>
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">التسويات</h1>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="min-h-[48px]"
        >
          {showCreateForm ? "إلغاء" : "إنشاء تسوية"}
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            إنشاء تسوية جديدة
          </h2>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courierId">المندوب</Label>
              <select
                id="courierId"
                value={createCourierId}
                onChange={(e) => setCreateCourierId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
              >
                <option value="">اختر المندوب</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.courierProfile?.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="settlementDate">تاريخ التسوية</Label>
              <Input
                id="settlementDate"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button
                onClick={handleCreate}
                disabled={createSubmitting}
                className="min-h-[48px]"
              >
                {createSubmitting ? "جارٍ الإنشاء..." : "إنشاء"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">المندوب</th>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">المبلغ المستحق</th>
              <th className="text-right p-3">المبلغ المدفوع</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  لا توجد تسويات
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="border-t">
                  <td className="p-3">
                    {batch.courier.user.name}
                    <br />
                    <span className="text-gray-500 text-xs">
                      {batch.courier.user.phone}
                    </span>
                  </td>
                  <td className="p-3">{formatDate(batch.settlementDate)}</td>
                  <td className="p-3">{formatCurrency(batch.amountDue)}</td>
                  <td className="p-3">
                    {batch.amountSettled
                      ? formatCurrency(batch.amountSettled)
                      : "-"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        batch.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : batch.status === "PARTIAL"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {statusLabel[batch.status] || batch.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {(batch.status === "PENDING" || batch.status === "PARTIAL") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openSettlementForm(batch)}
                        className="min-h-[48px]"
                      >
                        تم الدفع
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {settleBatchId && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            تسجيل دفعة
          </h2>

          {settleError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {settleError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="settleAmount">المبلغ المدفوع</Label>
              <Input
                id="settleAmount"
                type="number"
                placeholder="0.00"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleMarkSettled}
                disabled={settleSubmitting}
                className="min-h-[48px]"
              >
                {settleSubmitting ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
