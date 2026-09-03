import { auth } from "@/lib/auth"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !session.user?.role) {
    return null
  }
  if (session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function requireActiveSession() {
  const session = await auth()
  if (!session?.user) {
    return null
  }
  return session
}