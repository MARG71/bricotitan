// src/app/api/account/orders/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

// Tipo mínimo para que TS sepa que existe user.id
type AuthSession = {
  user: {
    id: string
  }
}

export async function GET(req: Request) {
  const session = (await getServerAuth()) as AuthSession | null

  // Si no hay usuario autenticado, devolvemos 401
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // Parámetros de paginación (opcionales)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Number(searchParams.get('pageSize') ?? '10')

  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100
      ? pageSize
      : 10

  const skip = (safePage - 1) * safePageSize

  // Buscamos los pedidos del usuario autenticado
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { id: 'desc' }, // usamos 'id' que seguro existe
      skip,
      take: safePageSize,
    }),
    prisma.order.count({
      where: { userId: session.user.id },
    }),
  ])

  return NextResponse.json({
    data: orders,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
    },
  })
}
