// src/app/api/account/orders/[id]/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  context: any, // 👈 importante: no tipar como { params: { id: string } }
) {
  // En Next 15, context.params puede ser una Promise, por eso usamos await
  const { id } = (await context.params) as { id: string }

  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // Order.id en tu schema es String (cuid), así que no hacemos Number()
  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      lines: true,
      address: true,
      invoice: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json(order)
}
