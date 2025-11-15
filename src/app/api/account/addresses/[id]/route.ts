// src/app/api/account/addresses/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH: actualizar dirección (marcar como defecto, etc.)
export async function PATCH(req: Request, context: any) {
  const { id: idParam } = await context.params
  const session = await requireAuth()

  const id = Number(idParam)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }

  const body = (await req.json().catch(() => null)) as { isDefault?: boolean } | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.isDefault) {
    // Quitamos el "default" del resto de direcciones del usuario
    await prisma.address.updateMany({
      where: { userId: session.user.id, NOT: { id } },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.address.update({
    where: { id },
    data: { isDefault: body.isDefault ?? undefined },
  })

  return NextResponse.json(updated)
}

// DELETE: eliminar dirección
export async function DELETE(req: Request, context: any) {
  const { id: idParam } = await context.params
  await requireAuth()

  const id = Number(idParam)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }

  await prisma.address.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
