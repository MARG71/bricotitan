import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      lines: { select: { id: true, ref: true, title: true, qty: true, priceExVat: true, vatRate: true, lineTotal: true } },
      invoice: { select: { id: true, number: true, issuedAt: true } },
      address: true,
    },
  })
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json(order)
}
