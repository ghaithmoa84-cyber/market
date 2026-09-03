import Link from "next/link"
import { auth } from "@/lib/auth"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary">
            يلا ماركت — يلا ماركت
          </h1>
          <p className="text-lg text-gray-600">
            منصة توصيل محلية في القنجرة وجناتا
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary text-white px-6 py-3 rounded-md min-h-[48px] flex items-center justify-center text-lg hover:bg-primary/90 transition-colors"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    )
  }

  const role = session.user?.role
  let dashboardHref = "/"

  if (role === "ADMIN") dashboardHref = "/admin"

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <header className="bg-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">يلا ماركت</h1>
          <span className="text-sm">
            {session.user.name || ""} — {role}
          </span>
        </div>
      </header>

      <main className="container mx-auto py-12">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-primary">
            مرحباً، {session.user.name || ""}
          </h2>

          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="inline-block bg-secondary text-white px-6 py-3 rounded-md min-h-[48px] flex items-center justify-center text-lg hover:bg-secondary/90 transition-colors"
            >
              لوحة الإدارة
            </Link>
          )}

          {["COURIER", "CUSTOMER"].includes(role || "") && (
            <p className="text-gray-600">
              مرحباً بك في يلا ماركت. واجهة المستخدم سيتم إطلاقها قريباً.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
