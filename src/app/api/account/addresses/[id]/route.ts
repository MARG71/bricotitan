import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  const body = await req.json().catch(()=>null) as { isDefault?: boolean } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (body.isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id, NOT: { id } }, data: { isDefault: false } })
  }

  const updated = await prisma.address.update({ where: { id }, data: { isDefault: body.isDefault ?? undefined } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireAuth()
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  await prisma.address.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
