import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const config = {
  matcher: [
    "/admin/:path*",
    "/courier/:path*",
    "/customer/:path*",
    "/cart/:path*",
    "/orders/:path*",
  ],
}

export async function middleware(request: Request) {
  const session = await auth()
  const { pathname } = new URL(request.url)

  const isLoggedIn = !!session?.user
  const role = session?.user?.role

  const isAdminRoute = pathname.startsWith("/admin")
  const isCourierRoute = pathname.startsWith("/courier")
  const isCustomerRoute = pathname.startsWith("/customer")

  if (!isLoggedIn) {
    if (isAdminRoute || isCourierRoute || isCustomerRoute) {
      const url = new URL(request.url)
      url.pathname = "/login"
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isCourierRoute && role !== "COURIER") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isCustomerRoute && role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}