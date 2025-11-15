// src/app/api/account/addresses/[id]/route.ts
// src/app/api/account/addresses/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// Sesión mínima que necesitamos
type AuthSession = {
  user: {
    id: string
  }
}

// PATCH → actualizar dirección (y gestionar "predeterminada")
export async function PATCH(request: Request, context: any) {
  // Usamos any para evitar problemas con el tipo del segundo argumento en Next 15
  const { id } = (context.params ?? {}) as { id: string }

  const session = (await requireAuth()) as AuthSession

  const body = await request.json()

  const {
    fullName,
    line1,
    line2,
    postalCode,
    city,
    province,
    country,
    isDefault,
  } = body

  // Actualizamos la dirección
  const updated = await prisma.address.update({
    where: { id },
    data: {
      fullName,
      line1,
      line2,
      postalCode,
      city,
      province,
      country,
      isDefault: !!isDefault,
      userId: session.user.id, // por seguridad
    },
  })

  // Si esta se marca como predeterminada, desmarcamos el resto
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, NOT: { id } },
      data: { isDefault: false },
    })
  }

  return NextResponse.json(updated)
}

// DELETE → borrar una dirección del usuario
export async function DELETE(_request: Request, context: any) {
  // También any aquí para que Next 15 no proteste
  const { id } = (context.params ?? {}) as { id: string }

  const session = (await requireAuth()) as AuthSession

  await prisma.address.deleteMany({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
