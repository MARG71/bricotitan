// src/lib/auth.config.ts
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { verifyPassword } from './password'

export const authConfig: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },

  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        // Ojo: usas `user.hash` en tu código, lo mantengo igual
        const ok = await verifyPassword(credentials.password, user.hash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        } as any
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        ;(token as any).id = u.id
        ;(token as any).role = u.role
        token.name = user.name ?? token.name
        token.email = user.email ?? token.email
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role
      }
      return session
    },
  },
}
