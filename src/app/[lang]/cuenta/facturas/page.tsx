import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Aceptamos cualquier tipo (incluye Decimal) y dentro lo convertimos a número
function money(n: any, currency = 'EUR') {
  let v: number

  if (typeof n === 'string') {
    v = Number(n)
  } else if (typeof n === 'number') {
    v = n
  } else if (n != null) {
    // Prisma Decimal u otros tipos -> intentamos convertir
    v = Number(n)
  } else {
    v = 0
  }

  return Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(v)
}

// Tipamos los props de la página para Next 15 (params como Promesa)
type FacturasPageProps = {
  params: Promise<{ lang: string }>
}

// Tipado mínimo de la sesión que necesitamos
type AuthSession = {
  user: {
    id: string
  }
}

export default async function FacturasPage({ params }: FacturasPageProps) {
  // Next 15: params es una Promesa en Server Components
  const { lang } = await params

  // Forzamos el tipo para que TS sepa que hay user.id
  const session = (await requireAuth()) as AuthSession

  const invoices = await prisma.invoice.findMany({
    where: { order: { userId: session.user.id } },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      total: true,
      order: {
        select: { id: true, currency: true },
      },
    },
  })

  return (
    <main>
      <h1 className="text-2xl font-bold mb-6">Tus facturas</h1>

      {invoices.length === 0 && (
        <div className="rounded-xl border p-4 text-sm text-gray-700">
          Aún no tienes facturas.
        </div>
      )}

      <ul className="grid gap-3">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className="rounded-xl border p-4 flex items-center justify-between"
          >
            <div className="text-sm">
              <div className="font-medium">Factura {inv.number}</div>
              <div className="text-gray-600">
                Pedido{' '}
                {inv.order ? (
                  <Link
                    href={`/${lang}/cuenta/pedidos/${inv.order.id}`}
                    className="underline hover:text-orange-500 transition"
                  >
                    {inv.order.id.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="italic text-gray-500">—</span>
                )}{' '}
                · {new Date(inv.issuedAt).toLocaleDateString('es-ES')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-lg font-semibold">
                {money(inv.total, inv.order?.currency ?? 'EUR')}
              </div>

              {/* Endpoint de descarga: ajusta si tu ruta es distinta */}
              <a
                href={`/api/account/invoices/${inv.id}/pdf`}
                className="mt-2 inline-block rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Descargar
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
