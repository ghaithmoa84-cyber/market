"use client"

import { ReactNode } from "react"
import Link from "next/link"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">يلا ماركت — لوحة الإدارة</h1>
          <nav className="flex gap-4">
            <Link
              href="/admin"
              className="hover:text-secondary transition-colors"
            >
              الرئيسية
            </Link>
            <Link
              href="/admin/users"
              className="hover:text-secondary transition-colors"
            >
              المستخدمين
            </Link>
            <Link
              href="/admin/stores"
              className="hover:text-secondary transition-colors"
            >
              المتاجر
            </Link>
            <Link
              href="/admin/categories"
              className="hover:text-secondary transition-colors"
            >
              الفئات
            </Link>
            <Link
              href="/admin/products"
              className="hover:text-secondary transition-colors"
            >
              المنتجات
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  )
}