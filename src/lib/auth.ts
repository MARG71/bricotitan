import { getServerSession } from 'next-auth'
import type { DefaultSession } from 'next-auth'
import { authConfig } from './auth.config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'GESTOR' | 'CLIENT'
    } & DefaultSession['user']
  }
  interface User {
    role: 'ADMIN' | 'GESTOR' | 'CLIENT'
  }
}

export async function getServerAuth() {
  // Compatible con next-auth v4
  return getServerSession(authConfig as any)
}

export async function requireAuth() {
  const session = await getServerAuth()
  if (!session?.user?.id) throw new Error('UNAUTHENTICATED')
  return session
}

export async function requireRole(roles: Array<'ADMIN' | 'GESTOR' | 'CLIENT'>) {
  const session = await getServerAuth()
  if (!session?.user?.id) throw new Error('UNAUTHENTICATED')
  const role = (session.user as any).role
  if (!roles.includes(role)) throw new Error('FORBIDDEN')
  return session
}
