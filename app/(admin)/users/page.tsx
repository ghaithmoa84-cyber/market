"use client"

import { useEffect, useState } from "react"
import { Button, Input, Label } from "@/components/ui/button"
import { z } from "zod"

const createUserSchema = z.object({
  phone: z.string().min(1, "مطلوب رقم الهاتف"),
  name: z.string().min(1, "مطلوب الاسم"),
  role: z.enum(["ADMIN", "COURIER", "CUSTOMER"]),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  vehicleType: z.string().optional(),
})

type User = {
  id: string
  phone: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("CUSTOMER")
  const [password, setPassword] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin?resource=users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const result = createUserSchema.safeParse({
      phone,
      name,
      role,
      password,
      vehicleType: role === "COURIER" ? vehicleType : undefined,
    })

    if (!result.success) {
      setFormError(
        result.error.issues.map((i) => i.message).join(", ")
      )
      return
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUser",
          data: result.data,
        }),
      })

      if (res.ok) {
        setPhone("")
        setName("")
        setPassword("")
        setVehicleType("")
        fetchUsers()
      } else {
        const data = await res.json()
        setFormError(data.error || "خطأ في الإنشاء")
      }
    } catch {
      setFormError("خطأ في الاتصال")
    }
  }

  const handleToggle = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleUser",
          data: { userId, isActive: !isActive },
        }),
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold text-primary">المستخدمين</h1>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          إنشاء مستخدم جديد
        </h2>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="مثال: 0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">الاسم</Label>
            <Input
              id="name"
              type="text"
              placeholder="الاسم الكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">الدور</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none min-h-[48px] text-base"
            >
              <option value="CUSTOMER">عميل</option>
              <option value="COURIER">مندوب</option>
              <option value="ADMIN">مشرف</option>
            </select>
          </div>

          <div>
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              placeholder="حدد كلمة مرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {role === "COURIER" && (
            <div>
              <Label htmlFor="vehicleType">نوع المركبة</Label>
              <Input
                id="vehicleType"
                type="text"
                placeholder="مثال: دراجة، سيارة..."
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                required
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Button type="submit" className="w-full sm:w-auto">
              إنشاء المستخدم
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">رقم الهاتف</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-6 text-gray-500">
                  جار التحميل...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-6 text-gray-500">
                  لا يوجد مستخدمين
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.phone}</td>
                  <td className="p-3">
                    {user.role === "ADMIN" ? "مشرف" : user.role === "COURIER" ? "مندوب" : "عميل"}
                  </td>
                  <td className="p-3">
                    {user.isActive ? "نشط" : "غير نشط"}
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant={user.isActive ? "outline" : "secondary"}
                      onClick={() =>
                        handleToggle(user.id, user.isActive)
                      }
                    >
                      {user.isActive ? "إيقاف" : "تفعيل"}
                    </Button>
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