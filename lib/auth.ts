import NextAuth, { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcryptjs from "bcryptjs"
import { z } from "zod"
import prisma from "@/lib/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      phone?: string
    }
  }
  interface JWT {
    role?: string
    id?: string
    phone?: string
  }
}

const credentialsSchema = z.object({
  phone: z.string().min(1, "يجب إدخال رقم الهاتف"),
  password: z.string().min(1, "يجب إدخال كلمة المرور"),
})

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "رقم الهاتف", type: "tel" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          const parsed = credentialsSchema.safeParse(credentials)
          if (!parsed.success) {
            throw new Error("بيانات التسجيل غير صحيحة")
          }

          const { phone, password } = parsed.data

          const user = await prisma.user.findUnique({
            where: { phone },
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              passwordHash: true,
            },
          })

          if (!user) {
            throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة")
          }

          if (!user.isActive) {
            throw new Error("المستخدم غير مفعّل")
          }

          const isValid = await bcryptjs.compare(
            password,
            user.passwordHash
          )

          if (!isValid) {
            throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة")
          }

          return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
          }
        } catch (err) {
          console.error("Authorize error:", err)
          throw new Error(
            err instanceof Error ? err.message : "حدث خطأ في التوثيق"
          )
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? undefined
        token.id = (user as { id?: string }).id ?? token.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const baseUser = session.user
        session.user = {
          ...baseUser,
          id: (token.id ?? baseUser.id) as string,
          role: (token.role ?? baseUser.role) as string | undefined,
          phone: (token.phone ?? baseUser.phone) as string | undefined,
        }
      }
      return session
    },
  },

  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)