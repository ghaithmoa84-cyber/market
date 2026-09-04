"use client"

import { ReactNode } from "react"
import Link from "next/link"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:text-secondary transition-colors">
            يلا ماركت
          </Link>
          <nav className="flex gap-4">
            <Link href="/customer/categories" className="hover:text-secondary transition-colors">
              الفئات
            </Link>
            <Link href="/customer/search" className="hover:text-secondary transition-colors">
              بحث
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  )
}
