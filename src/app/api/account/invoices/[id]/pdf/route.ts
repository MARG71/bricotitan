// src/app/api/account/invoices/[id]/pdf/route.ts
// src/app/api/account/invoices/[id]/pdf/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

// Tipo mínimo para que TS sepa que existe session.user.id
type AuthSession = {
  user: {
    id: string
  }
}

export async function GET(_req: Request, context: any) {
  // Forzamos el tipo aquí en vez de tipar el argumento
  const { id } = context.params as { id: string }

  const session = (await getServerAuth()) as AuthSession | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // Comprobamos que la factura existe y pertenece al usuario
  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      order: {
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      total: true,
      order: {
        select: {
          id: true,
          currency: true,
        },
      },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // 🔧 Aquí iría la generación real del PDF.
  // De momento devolvemos algo sencillo para que compile y funcione el endpoint.
  return NextResponse.json({
    message: 'PDF generation not implemented yet',
    invoiceId: invoice.id,
  })
}
