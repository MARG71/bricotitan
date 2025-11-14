import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, order: { userId: session.user.id } },
    select: { pdfPath: true, number: true },
  })
  if (!invoice) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Stub: si aún no hay PDF real, devolvemos un TXT amigable
  const body = `Factura ${invoice.number}\n(La generación de PDF se activará en la integración de Stripe/AFT)`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${invoice.number}.txt"`,
    },
  })
}
