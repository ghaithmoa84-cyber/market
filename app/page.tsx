import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  if (session.user.role === "COURIER") {
    redirect("/courier/orders")
  }

  if (session.user.role === "CUSTOMER") {
    redirect("/customer")
  }

  redirect("/login")
}
