// src/app/api/account/addresses/[id]/route.ts
// src/app/api/account/addresses/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

type RouteContext = {
  params: { id: string }
}

// Sesión mínima que necesitamos
type AuthSession = {
  user: {
    id: string
  }
}

// Actualizar dirección (y gestionar "predeterminada")
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = params
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

  // Actualizamos la dirección del usuario
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
    },
  })

  if (isDefault) {
    // Quitamos el "default" del resto de direcciones del usuario
    await prisma.address.updateMany({
      where: { userId: session.user.id, NOT: { id } },
      data: { isDefault: false },
    })
  }

  return NextResponse.json(updated)
}

// Borrar una dirección del usuario
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = params
  const session = (await requireAuth()) as AuthSession

  // Nos aseguramos de borrar solo direcciones del usuario
  await prisma.address.deleteMany({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
