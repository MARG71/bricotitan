import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET() {
  const session = await getServerAuth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  const invoices = await prisma.invoice.findMany({
    where: { order: { userId: session.user.id } },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true, number: true, issuedAt: true, total: true,
      order: { select: { id: true } },
    },
  })
  return NextResponse.json(invoices)
}
