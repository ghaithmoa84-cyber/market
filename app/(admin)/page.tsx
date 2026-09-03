import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user || session.user?.role !== "ADMIN") {
    redirect("/login")
  }

  const userName = session.user?.name || session.user?.email || "المشرف"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">لوحة الإدارة</h1>
        <p className="text-gray-600 mt-2">
          مرحباً، {userName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="المستخدمين" resource="users" />
        <StatCard title="المتاجر" resource="stores" />
        <StatCard title="المنتجات" resource="products" />
        <StatCard title="الفئات" resource="categories" />
      </div>
    </div>
  )
}

async function StatCard({
  title,
  resource,
}: {
  title: string
  resource: string
}) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/admin?resource=stats`,
    { next: { tags: ["admin-stats"] } }
  )

  let count = 0
  if (res.ok) {
    const data = await res.json()
    count = data[resource] || 0
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-primary">{count}</p>
    </div>
  )
}