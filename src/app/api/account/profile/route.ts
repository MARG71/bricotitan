import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await requireAuth()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await requireAuth()
  const body = await req.json().catch(()=>null) as { name?: string } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: body.name ?? null },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(updated)
}
