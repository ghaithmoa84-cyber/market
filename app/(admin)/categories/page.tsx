"use client"

import { useEffect, useState, useCallback } from "react"
import { Button, Input, Label } from "@/components/ui/button"

type Category = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin?resource=categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      fetchCategories()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchCategories])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (name.length < 1) {
      setFormError("مطلوب اسم الفئة")
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createCategory",
          data: { name },
        }),
      })

      if (res.ok) {
        setName("")
        fetchCategories()
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
      <h1 className="text-2xl font-bold text-primary">الفئات</h1>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          إنشاء فئة جديدة
        </h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="categoryName">اسم الفئة</Label>
            <Input
              id="categoryName"
              placeholder="مثال: مواد غذائية، مشروبات..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              إنشاء الفئة
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">اسم الفئة</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center p-6 text-gray-500">
                  جار التحميل...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-6 text-gray-500">
                  لا توجد فئات
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-t">
                  <td className="p-3">{cat.name}</td>
                  <td className="p-3">
                    {cat.isActive ? "نشط" : "غير نشط"}
                  </td>
                  <td className="p-3">
                    {new Date(cat.createdAt).toLocaleDateString("ar-SY")}
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