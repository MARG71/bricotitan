// src/app/[lang]/cuenta/pedidos/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
type PedidoPageProps = {
  params: Promise<{ lang: string; id: string }>
}

// Sesión mínima que necesitamos
type AuthSession = {
  user: {
    id: string
  }
}

export default async function PedidoPage({ params }: PedidoPageProps) {
  const { lang, id } = await params

  const session = (await requireAuth()) as AuthSession

  const order = (await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      lines: true,
      invoice: true,
      address: true,
    },
  })) as any

  if (!order) notFound()

  return (
    <main className="container mx-auto py-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pedido {order.id}</h1>
          <p className="text-sm text-zinc-600">
            Realizado el{' '}
            {order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('es-ES')
              : '—'}
          </p>
        </div>

        <Link
          href={`/${lang}/cuenta/pedidos`}
          className="rounded-md border px-4 py-2 text-sm hover:bg-zinc-100"
        >
          Volver a mis pedidos
        </Link>
      </header>

      {/* Resumen */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 text-sm shadow-sm md:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Líneas del pedido</h2>
          {order.lines?.length === 0 ? (
            <p className="text-zinc-600 text-sm">Este pedido no tiene líneas.</p>
          ) : (
            <ul className="divide-y text-sm">
              {order.lines.map((line: any) => (
                <li key={line.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">
                      {line.productName ?? line.sku ?? 'Producto'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Cantidad: {line.quantity} · Precio:{' '}
                      {money(line.unitPrice, order.currency ?? 'EUR')}
                    </p>
                  </div>
                  <div className="font-semibold">
                    {money(
                      line.total ?? line.unitPrice * line.quantity,
                      order.currency ?? 'EUR'
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 text-sm shadow-sm">
            <h2 className="mb-3 text-base font-semibold">Resumen</h2>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Total</span>
              <span className="text-lg font-semibold">
                {money(order.total, order.currency ?? 'EUR')}
              </span>
            </div>
            {order.status && (
              <p className="mt-2 text-xs text-zinc-500">
                Estado: <span className="font-medium">{order.status}</span>
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 text-sm shadow-sm">
            <h2 className="mb-2 text-base font-semibold">Dirección de envío</h2>
            {order.address ? (
              <div className="text-xs text-zinc-700 space-y-0.5">
                <p>{order.address.fullName}</p>
                <p>
                  {order.address.line1}
                  {order.address.line2 && `, ${order.address.line2}`}
                </p>
                <p>
                  {order.address.postalCode} {order.address.city}
                </p>
                {order.address.province && <p>{order.address.province}</p>}
                {order.address.country && <p>{order.address.country}</p>}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Sin dirección asociada</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 text-sm shadow-sm">
            <h2 className="mb-2 text-base font-semibold">Factura</h2>
            {order.invoice ? (
              <div className="text-xs text-zinc-700 space-y-1">
                <p>Número: {order.invoice.number}</p>
                <p>
                  Fecha:{' '}
                  {order.invoice.issuedAt
                    ? new Date(order.invoice.issuedAt).toLocaleDateString('es-ES')
                    : '—'}
                </p>
                <Link
                  href={`/${lang}/cuenta/facturas`}
                  className="mt-1 inline-flex text-xs text-orange-600 hover:underline"
                >
                  Ver todas mis facturas
                </Link>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Sin factura asociada</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
