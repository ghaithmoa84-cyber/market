import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

const edgeConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [],
}

export const { auth: edgeAuth } = NextAuth(edgeConfig)
