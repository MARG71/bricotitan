// src/app/api/account/orders/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

// Tipo mínimo de sesión para que TS sepa que existe user.id
type AuthSession = {
  user: {
    id: string
  }
}

export async function GET(_req: Request, { params }: any) {
  const session = (await getServerAuth()) as AuthSession | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const orderId = String(params?.id)

  // Buscamos el pedido del usuario autenticado
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
    },
    include: {
      items: true,
      address: true,
      invoice: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json(order)
}
