// src/app/api/account/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(req: NextRequest, context: any) {
  // 👇 recogemos el id desde el contexto (compatible con Next 15)
  const { id } = await context.params

  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id, // 👈 usamos la variable id que viene de la URL
      order: { userId: session.user.id },
    },
    select: { pdfPath: true, number: true },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // De momento devolvemos un TXT amigable (stub)
  const body = `Factura ${invoice.number}\n(La generación de PDF se activará en la integración de Stripe/AFT)`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${invoice.number}.txt"`,
    },
  })
}

