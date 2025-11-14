import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function money(n: any, currency = 'EUR') {
  const v = typeof n === 'string' ? Number(n) : n
  return Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(v ?? 0)
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>
}) {
  const { id, lang } = await params
  const session = await requireAuth()
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { lines: true, invoice: true, address: true },
  })
  if (!order) notFound()

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedido {order.id.slice(0,8)}</h1>
        <Link href={`/${lang}/cuenta/pedidos`} className="text-sm underline">Volver</Link>
      </div>
      {/* ... resto igual ... */}
    </main>
  )
}
