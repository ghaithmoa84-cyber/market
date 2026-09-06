"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button, Input, Label } from "@/components/ui/button"

interface SearchResult {
  product: {
    id: string
    name: string
    brand?: string
    category: { name: string }
  }
  storeProducts: Array<{
    id: string
    price: number
    updatedAt: string
    store: {
      id: string
      name: string
      address: string
    }
  }>
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const res = await fetch(`/api/customer/search?q=${encodeURIComponent(query.trim())}`)

      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      } else {
        console.error("Search failed")
      }
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">البحث عن منتجات</h1>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="search">ابحث عن منتج</Label>
          <Input
            id="search"
            type="text"
            placeholder="أدخل اسم المنتج..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-base"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "جار البحث..." : "بحث"}
          </Button>
        </div>
      </form>

      {hasSearched && !loading && (
        <div>
          {results.length === 0 ? (
            <EmptyState
              title="لا توجد نتائج"
              description="لم يتم العثور على منتجات مطابقة لبحثك"
            />
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">تم العثور على {results.length} منتج</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result) => (
                  <div
                    key={result.product.id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/products/${result.product.id}`}>
                      <h2 className="text-xl font-bold text-primary mb-1 hover:underline">
                        {result.product.name}
                      </h2>
                    </Link>
                    {result.product.brand && (
                      <p className="text-gray-600 text-sm mb-3">العلامة التجارية: {result.product.brand}</p>
                    )}

                    <div className="space-y-2 mt-4">
                      {result.storeProducts.map((sp) => (
                        <div
                          key={sp.id}
                          className="p-3 rounded-md bg-gray-50"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{sp.store.name}</span>
                            <span className="text-lg font-bold text-primary">{sp.price.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            آخر تحديث: {formatDate(sp.updatedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">جار التحميل...</div>}>
      <SearchContent />
    </Suspense>
  )
}
