// src/app/api/account/addresses/route.ts
// src/app/api/account/addresses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// Tipo mínimo para que TypeScript sepa que existe session.user.id
type AuthSession = {
  user: {
    id: string
  }
}

// GET → listar direcciones del usuario autenticado
export async function GET() {
  const session = (await requireAuth()) as AuthSession

  const list = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(list)
}

// POST → crear nueva dirección
export async function POST(request: Request) {
  const session = (await requireAuth()) as AuthSession
  const body = await request.json()

  const {
    fullName,
    line1,
    line2,
    city,
    country,
    isDefault,
  } = body

  // Prisma exige un campo "postal" obligatorio en Address
  const postal: string =
    typeof body.postal === 'string'
      ? body.postal
      : typeof body.postalCode === 'string'
        ? body.postalCode
        : ''

  // Creamos la dirección solo con campos que sabemos que existen en el modelo
  const created = await prisma.address.create({
    data: {
      fullName,
      line1,
      line2,
      city,
      country,
      postal, // ✅ campo obligatorio en el modelo
      isDefault: !!isDefault,
      userId: session.user.id,
    },
  })

  // Si esta es por defecto, desmarcamos las demás
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: session.user.id,
        NOT: { id: created.id },
      },
      data: { isDefault: false },
    })
  }

  return NextResponse.json(created)
}
