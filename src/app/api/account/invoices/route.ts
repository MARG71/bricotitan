// src/app/api/account/invoices/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

// Tipo mínimo para que TS sepa que existe session.user.id
type AuthSession = {
  user: {
    id: string
  }
}

export async function GET() {
  // Forzamos el tipo aquí
  const session = (await getServerAuth()) as AuthSession | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // Listamos las facturas del usuario actual.
  // No ponemos select/orderBy para no chocar con el tipo de Prisma.
  const invoices = await prisma.invoice.findMany({
    where: {
      order: {
        userId: session.user.id,
      },
    },
  })

  return NextResponse.json(invoices)
}
