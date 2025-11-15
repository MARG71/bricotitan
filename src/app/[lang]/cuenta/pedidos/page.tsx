// src/app/[lang]/cuenta/pedidos/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// Aceptamos cualquier tipo numérico/Decimal y lo convertimos a número
function money(n: any, currency = 'EUR') {
  let v: number

  if (typeof n === 'string') {
    v = Number(n)
  } else if (typeof n === 'number') {
    v = n
  } else if (n != null) {
    v = Number(n)
  } else {
    v = 0
  }

  return Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(v)
}

// Next 15: params es una Promesa
type PedidosPageProps = {
  params: Promise<{ lang: string }>
}

// Sesión mínima que necesitamos
type AuthSession = {
  user: {
    id: string
  }
}

export default async function PedidosPage({ params }: PedidosPageProps) {
  const { lang } = await params

  const session = (await requireAuth()) as AuthSession

  const orders = (await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      total: true,
      currency: true,
      status: true,
      invoice: {
        select: {
          id: true,
          number: true,
          issuedAt: true,
        },
      },
    },
  })) as any[]

  return (
    <main className="container mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
        <p className="text-sm text-zinc-600">
          Historial de tus últimos pedidos ({orders.length})
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-gray-700">
          Aún no has realizado ningún pedido.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border bg-white p-4 text-sm shadow-sm flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">Pedido {order.id.slice(0, 8)}</p>
                <p className="text-xs text-zinc-500">
                  Realizado el{' '}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('es-ES')
                    : '—'}
                </p>
                {order.invoice && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Factura:{' '}
                    <span className="font-medium">{order.invoice.number}</span>{' '}
                    ·{' '}
                    {order.invoice.issuedAt
                      ? new Date(
                          order.invoice.issuedAt,
                        ).toLocaleDateString('es-ES')
                      : '—'}
                  </p>
                )}
                {order.status && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Estado: <span className="font-medium">{order.status}</span>
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">Total</p>
                <p className="text-lg font-semibold">
                  {money(order.total, order.currency ?? 'EUR')}
                </p>

                <Link
                  href={`/${lang}/cuenta/pedidos/${order.id}`}
                  className="mt-2 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                >
                  Ver detalle
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
