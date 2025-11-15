// src/app/api/account/profile/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// Tipo mínimo para que TS sepa que existe user.id
type AuthSession = {
  user: {
    id: string
  }
}

export async function GET() {
  const session = (await requireAuth()) as AuthSession

  // Por si acaso, aunque requireAuth debería garantizarlo
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      // añade aquí más campos si los necesitas
    },
  })

  return NextResponse.json(user)
}

// Opcional: actualizar perfil (por ejemplo, solo el nombre)
export async function PATCH(req: Request) {
  const session = (await requireAuth()) as AuthSession

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const { name } = body as { name?: string }

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: 'INVALID_NAME', message: 'Nombre no válido' },
      { status: 400 },
    )
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}
