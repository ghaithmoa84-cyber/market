"use client"

import { useEffect, useState, useCallback } from "react"
import { Button, Input, Label } from "@/components/ui/button"

const createStoreSchema = {
  name: (v: string) => (v.length < 1 ? "مطلوب" : null),
  address: (v: string) => (v.length < 1 ? "مطلوب" : null),
}

type Store = {
  id: string
  name: string
  address: string
  phone?: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin?resource=stores")
      if (res.ok) {
        const data = await res.json()
        setStores(data.stores || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchStores()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchStores])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const err1 = createStoreSchema.name(name)
    const err2 = createStoreSchema.address(address)
    if (err1 || err2) {
      setFormError([err1, err2].filter(Boolean).join(", "))
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createStore",
          data: { name, address, phone: phone || undefined },
        }),
      })

      if (res.ok) {
        setName("")
        setAddress("")
        setPhone("")
        fetchStores()
      } else {
        const data = await res.json()
        setFormError(data.error || "خطأ في الإنشاء")
      }
    } catch {
      setFormError("خطأ في الاتصال")
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold text-primary">المتاجر</h1>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          إنشاء متجر جديد
        </h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="storeName">اسم المتجر</Label>
            <Input
              id="storeName"
              placeholder="اسم المتجر"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="storeAddress">العنوان</Label>
            <Input
              id="storeAddress"
              placeholder="العنوان الكامل"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="storePhone">رقم الهاتف (اختياري)</Label>
            <Input
              id="storePhone"
              type="tel"
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <Button type="submit" className="w-full sm:w-auto">
              إنشاء المتجر
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">اسم المتجر</th>
              <th className="text-right p-3">العنوان</th>
              <th className="text-right p-3">رقم الهاتف</th>
              <th className="text-right p-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-500">
                  جار التحميل...
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-gray-500">
                  لا يوجد متاجر
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id} className="border-t">
                  <td className="p-3">{store.name}</td>
                  <td className="p-3">{store.address}</td>
                  <td className="p-3">{store.phone || "—"}</td>
                  <td className="p-3">
                    {store.isActive ? "نشط" : "غير نشط"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}