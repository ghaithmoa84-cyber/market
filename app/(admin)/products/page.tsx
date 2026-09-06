"use client"

import { useEffect, useState, useCallback } from "react"
import { Button, Input, Label } from "@/components/ui/button"

type Category = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  brand?: string | null
  categoryId: string
  category: Category
  storeProducts: StoreProductLink[]
  isActive: boolean
  createdAt: string
}

type StoreProductLink = {
  id: string
  storeId: string
  price: number
  createdAt: string
}

type Store = {
  id: string
  name: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  // Create product form
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // Link product to store form
  const [linkStoreId, setLinkStoreId] = useState("")
  const [linkProductId, setLinkProductId] = useState("")
  const [linkPrice, setLinkPrice] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)

  // Update price form
  const [updateStoreProductId, setUpdateStoreProductId] = useState("")
  const [updatePrice, setUpdatePrice] = useState("")
  const [updateError, setUpdateError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, categoriesRes, storesRes] = await Promise.all([
        fetch("/api/admin?resource=products"),
        fetch("/api/admin?resource=categories"),
        fetch("/api/admin?resource=stores"),
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(
          (data.products || []).map((p: { storeProducts?: unknown[] }) => ({
            ...p,
            storeProducts: Array.isArray(p.storeProducts) ? p.storeProducts : [],
          }))
        )
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
      if (storesRes.ok) {
        const data = await storesRes.json()
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
      fetchData()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchData])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name || !categoryId) {
      setFormError("اسم المنتج والفئة مطلوبان")
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createProduct",
          data: {
            name,
            brand: brand || undefined,
            categoryId,
          },
        }),
      })

      if (res.ok) {
        setName("")
        setBrand("")
        setCategoryId("")
        fetchData()
      } else {
        const data = await res.json()
        setFormError(data.error || "خطأ في الإنشاء")
      }
    } catch {
      setFormError("خطأ في الاتصال")
    }
  }

  const handleLinkProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkError(null)

    if (!linkStoreId || !linkProductId || !linkPrice) {
      setLinkError("جميع الحقول مطلوبة")
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "linkProduct",
          data: {
            storeId: linkStoreId,
            productId: linkProductId,
            price: Number(linkPrice),
          },
        }),
      })

      if (res.ok) {
        setLinkStoreId("")
        setLinkProductId("")
        setLinkPrice("")
        fetchData()
      } else {
        const data = await res.json()
        setLinkError(data.error || "خطأ في الربط")
      }
    } catch {
      setLinkError("خطأ في الاتصال")
    }
  }

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdateError(null)

    if (!updateStoreProductId || !updatePrice) {
      setUpdateError("جميع الحقول مطلوبة")
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePrice",
          data: {
            storeProductId: updateStoreProductId,
            newPrice: Number(updatePrice),
          },
        }),
      })

      if (res.ok) {
        setUpdateStoreProductId("")
        setUpdatePrice("")
        fetchData()
      } else {
        const data = await res.json()
        setUpdateError(data.error || "خطأ في التحديث")
      }
    } catch {
      setUpdateError("خطأ في الاتصال")
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold text-primary">المنتجات</h1>

      {/* Create Product Form */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          إنشاء منتج جديد
        </h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {formError}
          </div>
        )}

        <form
          onSubmit={handleCreateProduct}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <Label htmlFor="productName">اسم المنتج</Label>
            <Input
              id="productName"
              placeholder="اسم المنتج"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="productBrand">العلامة (اختياري)</Label>
            <Input
              id="productBrand"
              placeholder="مثال: شركة فخمة"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="productCategory">الفئة</Label>
            <select
              id="productCategory"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
              required
            >
              <option value="">اختر الفئة</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              إنشاء المنتج
            </Button>
          </div>
        </form>
      </div>

      {/* Link Product to Store Form */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          ربط منتج بمتجر (تحديد السعر)
        </h2>

        {linkError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {linkError}
          </div>
        )}

        <form
          onSubmit={handleLinkProduct}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <Label htmlFor="linkStore">المتجر</Label>
            <select
              id="linkStore"
              value={linkStoreId}
              onChange={(e) => setLinkStoreId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
              required
            >
              <option value="">اختر المتجر</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="linkProduct">المنتج</Label>
            <select
              id="linkProduct"
              value={linkProductId}
              onChange={(e) => setLinkProductId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
              required
            >
              <option value="">اختر المنتج</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="linkPrice">السعر (ل.س)</Label>
            <Input
              id="linkPrice"
              type="number"
              placeholder="مثال: 100"
              value={linkPrice}
              onChange={(e) => setLinkPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              ربط المنتج
            </Button>
          </div>
        </form>
      </div>

      {/* Update Price Form */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          تحديث سعر المنتج
        </h2>

        {updateError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {updateError}
          </div>
        )}

        <form
          onSubmit={handleUpdatePrice}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div>
            <Label htmlFor="updateStoreProductId">رابط المتجر-المنتج</Label>
            <select
              id="updateStoreProductId"
              value={updateStoreProductId}
              onChange={(e) => setUpdateStoreProductId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
              required
            >
              <option value="">اختر الرابط</option>
              {products
                .flatMap((p) =>
                  p.storeProducts.map((sp) => ({
                    id: sp.id,
                    label: `${p.name} — ${stores.find((s) => s.id === sp.storeId)?.name || sp.storeId}`,
                    price: sp.price,
                  }))
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} (السعر الحالي: {item.price})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <Label htmlFor="updatePrice">السعر الجديد (ل.س)</Label>
            <Input
              id="updatePrice"
              type="number"
              placeholder="مثال: 120"
              value={updatePrice}
              onChange={(e) => setUpdatePrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              تحديث السعر
            </Button>
          </div>
        </form>
      </div>

      {/* Price History Viewer */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          سجل أسعار المنتجات
        </h2>

        {loading ? (
          <p className="text-gray-500">جار التحميل...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3">المنتج</th>
                  <th className="text-right p-3">المتجر</th>
                  <th className="text-right p-3">السعر</th>
                  <th className="text-right p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {products.flatMap((p) =>
                  p.storeProducts.map((sp) => (
                    <tr key={sp.id} className="border-t">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3">
                        {stores.find((s) => s.id === sp.storeId)?.name ||
                          sp.storeId}
                      </td>
                      <td className="p-3">{sp.price.toString()}</td>
                      <td className="p-3">
                        {new Date(sp.createdAt).toLocaleString("ar-SY")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}