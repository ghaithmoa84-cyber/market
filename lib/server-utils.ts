import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !session.user?.id) {
    return null
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  })
  if (user?.role !== "ADMIN" || !user.isActive) {
    return null
  }
  return session
}

export async function requireActiveSession() {
  const session = await auth()
  if (!session?.user || !session.user?.id) {
    return null
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true },
  })
  if (!user?.isActive) {
    return null
  }
  return session
}