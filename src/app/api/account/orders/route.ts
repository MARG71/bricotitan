import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerAuth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 10), 50)
  const skip = (page - 1) * pageSize

  const [total, items] = await Promise.all([
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip, take: pageSize,
      select: {
        id: true, status: true, total: true, currency: true, createdAt: true, paidAt: true,
        lines: { select: { id: true, title: true, qty: true } },
      },
    }),
  ])

  return NextResponse.json({ page, pageSize, total, items })
}
