import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function money(n: any, currency = 'EUR') {
  const v = typeof n === 'string' ? Number(n) : n
  return Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(v ?? 0)
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-emerald-100 text-emerald-700',
    FULFILLED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-gray-200 text-gray-700',
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

export default async function PedidosPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const session = await requireAuth()
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, status: true, total: true, currency: true, createdAt: true, paidAt: true,
      lines: { select: { id: true, title: true, qty: true } },
    },
  })

  return (
    <main>
      <h1 className="text-2xl font-bold mb-6">Tus pedidos</h1>
      {orders.length === 0 && (
        <div className="rounded-xl border p-4 text-sm text-gray-700">Aún no tienes pedidos.</div>
      )}
      <div className="grid gap-4">
        {orders.map(o => (
          <div key={o.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                <div className="font-medium">Pedido <span className="font-mono">{o.id.slice(0,8)}</span></div>
                <div>Fecha: {new Date(o.createdAt).toLocaleString('es-ES')}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${statusBadge(o.status)}`}>{o.status}</div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-lg font-semibold">{money(o.total, o.currency)}</div>
              </div>
            </div>
            <ul className="mt-3 text-sm text-gray-700 list-disc pl-5">
              {o.lines.slice(0, 3).map(l => <li key={l.id}>{l.title} × {l.qty}</li>)}
              {o.lines.length > 3 && <li>… y {o.lines.length - 3} más</li>}
            </ul>
            <div className="mt-3">
              <Link href={`/${lang}/cuenta/pedidos/${o.id}`} className="text-sm underline">Ver detalle</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
