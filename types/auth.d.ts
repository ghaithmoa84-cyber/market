import NextAuth from 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      isActive: boolean
      phone?: string
      courierId?: string
      customerId?: string
    } & DefaultSession['user']
  }
  interface User {
    role: string
    isActive: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    isActive: boolean
    phone?: string
    courierId?: string
    customerId?: string
  }
}
