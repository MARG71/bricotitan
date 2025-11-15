// src/lib/auth.ts
import { getServerSession } from 'next-auth'
import type { DefaultSession, Session } from 'next-auth'
import { authConfig } from './auth.config'

// === Augmentación de tipos de NextAuth ===
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

// Sesión de aplicación (para que TS sepa que user tiene id y role)
export type AppSession = Session & {
  user: Session['user'] & {
    id: string
    role: 'ADMIN' | 'GESTOR' | 'CLIENT'
  }
}

// Wrapper tipado de getServerSession
export async function getServerAuth(): Promise<AppSession | null> {
  const session = await getServerSession(authConfig)
  return session as AppSession | null
}

// Exige sesión autenticada
export async function requireAuth(): Promise<AppSession> {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    throw new Error('UNAUTHENTICATED')
  }
  return session
}

// Exige uno de los roles indicados
export async function requireRole(
  roles: Array<'ADMIN' | 'GESTOR' | 'CLIENT'>
): Promise<AppSession> {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    throw new Error('UNAUTHENTICATED')
  }

  const role = session.user.role
  if (!roles.includes(role)) {
    throw new Error('FORBIDDEN')
  }

  return session
}
