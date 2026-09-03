"use client"

import { useState, useEffect, FormEvent } from "react"
import Link from "next/link"
import { Button, Input } from "@/components/ui/button"

interface Address {
  id: string
  label?: string
  addressText: string
  deliveryNotes?: string
  isDefault: boolean
}

interface CartItem {
  storeId: string
  storeName?: string
  productId?: string
  productName?: string
  isCustom: boolean
  customDescription?: string
  requestedQty: number
  unit: string
  expectedPrice: number
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: "",
    addressText: "",
    deliveryNotes: "",
    isDefault: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    storeId: "",
    storeName: "",
    productId: "",
    productName: "",
    isCustom: false,
    customDescription: "",
    requestedQty: 1,
    unit: "PIECE",
    expectedPrice: 0,
  })

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        if (data.addresses) {
          setAddresses(data.addresses)
          const def = data.addresses.find((a: Address) => a.isDefault)
          if (def) setSelectedAddressId(def.id)
        }
      })
      .catch(() => {})
  }, [])

  const addItem = () => {
    if (!form.storeId) return
    const newItem: CartItem = {
      storeId: form.storeId,
      storeName: form.storeName,
      productId: form.productId || undefined,
      productName: form.productName,
      isCustom: form.isCustom,
      customDescription: form.customDescription || undefined,
      requestedQty: form.requestedQty,
      unit: form.unit,
      expectedPrice: form.expectedPrice,
    }
    setItems([...items, newItem])
    setForm({
      storeId: "",
      storeName: "",
      productId: "",
      productName: "",
      isCustom: false,
      customDescription: "",
      requestedQty: 1,
      unit: "PIECE",
      expectedPrice: 0,
    })
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + item.requestedQty * item.expectedPrice, 0)
  const deliveryFee = 60 + Math.max(20, 0.02 * subtotal)
  const total = subtotal + deliveryFee

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (items.length === 0) {
      setError("السلة فارغة")
      return
    }
    if (!selectedAddressId) {
      setError("اختر عنوان التوصيل")
      return
    }

    setSubmitting(true)

    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          items: items.map((item) => ({
            storeId: item.storeId,
            productId: item.productId,
            isCustom: item.isCustom,
            customDescription: item.customDescription,
            requestedQty: item.requestedQty,
            unit: item.unit,
            expectedPrice: item.expectedPrice,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "حدث خطأ")
        setSubmitting(false)
        return
      }

      setSuccess("تم إنشاء الطلب بنجاح")
      setItems([])
      setTimeout(() => {
        window.location.href = `/orders/${data.order.orderId}`
      }, 1000)
    } catch {
      setError("حدث خطأ في الاتصال")
      setSubmitting(false)
    }
  }

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAddress),
    })
    const data = await res.json()
    if (res.ok) {
      setAddresses([...addresses, data.address])
      setSelectedAddressId(data.address.id)
      setShowAddressForm(false)
      setNewAddress({ label: "", addressText: "", deliveryNotes: "", isDefault: false })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">سلة التسوق</h1>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">السلة فارغة</h2>
          <p className="text-gray-600 mb-4">أضف منتجات من المتاجر للبدء</p>
          <Link
            href="/categories"
            className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors min-h-[48px]"
          >
            تصفح الفئات
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">العناصر</h2>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.productName || item.customDescription || "عنصر مخصص"} — {item.storeName || item.storeId}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.requestedQty} × {item.expectedPrice.toLocaleString()} = {(item.requestedQty * item.expectedPrice).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(idx)}
                >
                  حذف
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>المجموع الفرعي</span>
              <span>{subtotal.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>أجرة التوصيل</span>
              <span>{deliveryFee.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t">
              <span>الإجمالي</span>
              <span>{total.toLocaleString()} ل.س</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">عنوان التوصيل</h2>
            {addresses.length === 0 && !showAddressForm && (
              <p className="text-gray-600">لا توجد عناوين محفوظة</p>
            )}
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer ${
                  selectedAddressId === addr.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="min-h-[48px]"
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {addr.label || "عنوان"} {addr.isDefault && "(افتراضي)"}
                  </p>
                  <p className="text-sm text-gray-600">{addr.addressText}</p>
                </div>
              </label>
            ))}
            {!showAddressForm ? (
              <Button type="button" variant="outline" onClick={() => setShowAddressForm(true)}>
                إضافة عنوان جديد
              </Button>
            ) : (
              <form onSubmit={saveAddress} className="space-y-4 border-t pt-4">
                <div>
                  <Label>العنوان</Label>
                  <Input
                    required
                    value={newAddress.addressText}
                    onChange={(e) => setNewAddress({ ...newAddress, addressText: e.target.value })}
                  />
                </div>
                <div>
                  <Label>ملاحظات التوصيل (اختياري)</Label>
                  <Input
                    value={newAddress.deliveryNotes}
                    onChange={(e) => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">حفظ العنوان</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
          </div>

          {error && <p className="text-red-600 text-center">{error}</p>}
          {success && <p className="text-green-600 text-center">{success}</p>}

          <Button type="submit" className="w-full" disabled={submitting || items.length === 0 || !selectedAddressId}>
            {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">إضافة عنصر للسلة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>اسم المتجر</Label>
            <Input
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value, storeId: e.target.value })}
              placeholder="مثال: متجر الفضة"
            />
          </div>
          <div>
            <Label>اسم المنتج (اختياري)</Label>
            <Input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value, productId: e.target.value })}
              placeholder="مثال: خبز"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isCustom"
            checked={form.isCustom}
            onChange={(e) => setForm({ ...form, isCustom: e.target.checked })}
            className="min-h-[48px]"
          />
          <Label htmlFor="isCustom">عنصر مخصص</Label>
        </div>
        {form.isCustom && (
          <div>
            <Label>وصف العنصر</Label>
            <Input
              value={form.customDescription}
              onChange={(e) => setForm({ ...form, customDescription: e.target.value })}
              placeholder="مثال: 1 كغ لحم عجل"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>الكمية</Label>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              value={form.requestedQty}
              onChange={(e) => setForm({ ...form, requestedQty: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>الوحدة</Label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px]"
            >
              <option value="PIECE">قطعة</option>
              <option value="WEIGHT">وزن</option>
              <option value="VOLUME">حجم</option>
              <option value="PACKAGE">علبة</option>
            </select>
          </div>
          <div>
            <Label>السعر المتوقع (ل.س)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.expectedPrice}
              onChange={(e) => setForm({ ...form, expectedPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <Button type="button" onClick={addItem} disabled={!form.storeId || form.requestedQty <= 0}>
          إضافة للسلة
        </Button>
      </div>
    </div>
  )
}

function Label({ className = "", children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`} {...props}>
      {children}
    </label>
  )
}
