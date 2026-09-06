"use client"

import { Suspense, useState, FormEvent, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Input, Label } from "@/components/ui/button"
import { z } from "zod"

const phoneSchema = z.string().min(1, "يجب إدخال رقم الهاتف")
const passwordSchema = z.string().min(1, "يجب إدخال كلمة المرور")

function LoginForm({ onSuccess }: { onSuccess: (url: string) => void }) {
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState("")
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || ""))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const phoneResult = phoneSchema.safeParse(phone)
    const passwordResult = passwordSchema.safeParse(password)

    if (!phoneResult.success || !passwordResult.success) {
      setError("يرجى ملء جميع الحقول بشكل صحيح")
      return
    }

    if (!csrfToken) {
      setError("حدث خطأ في التهيئة. أعد تحميل الصفحة.")
      return
    }

    try {
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          phone,
          password,
          redirect: "false",
          callbackUrl,
        }),
      })

      if (res.ok) {
        onSuccess(callbackUrl)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(
          data.message ||
            data.error ||
            "رقم الهاتف أو كلمة المرور غير صحيحة"
        )
      }
    } catch {
      setError("حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى")
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center text-primary mb-6">
        يلا ماركت — تسجيل الدخول
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="أدخل رقم هاتفك"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password"
            type="password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg">
          تسجيل الدخول
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-center text-gray-600">جاري التحميل...</div>}>
        <LoginForm onSuccess={(url) => router.push(url)} />
      </Suspense>
    </div>
  )
}
