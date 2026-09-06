import prisma from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      products: {
        where: { isActive: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">الفئات</h1>

      {categories.length === 0 ? (
        <EmptyState
          title="لا توجد فئات"
          description="لم يتم إنشاء أي فئات بعد"
          action="/"
          actionLabel="العودة للرئيسية"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow block"
            >
              <h2 className="text-xl font-bold text-primary mb-2">{category.name}</h2>
              <p className="text-gray-600">{category.products.length} منتج</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
  actionLabel,
}: {
  title: string
  description: string
  action: string
  actionLabel: string
}) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <a
        href={action}
        className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors min-h-[48px]"
      >
        {actionLabel}
      </a>
    </div>
  )
}
