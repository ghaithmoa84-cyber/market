import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"

export default async function CustomerHomePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-primary mb-2">
          مرحباً، {session.user.name || "عميلنا الكريم"}
        </h1>
        <p className="text-gray-600">ابحث عن المنتجات وقارن الأسعار بين المتاجر</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CategoryLink href="/customer/categories" title="تصفح الفئات" description="استعرض جميع الفئات المتاحة" />
        <CategoryLink href="/customer/search" title="بحث عن منتج" description="ابحث عن أي منتج تريده" />
        <CategoryLink href="/customer/stores" title="المتاجر" description="تصفح المتاجر النشطة" />
      </div>
    </div>
  )
}

async function CategoryLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow block"
    >
      <h2 className="text-xl font-bold text-primary mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  )
}
