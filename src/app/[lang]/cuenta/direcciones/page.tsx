// src/app/[lang]/cuenta/direcciones/page.tsx
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'

type PageProps = {
  params: Promise<{ lang: string }>
}

// Ajusta este tipo si tu sesión tiene más campos
type AuthSession = {
  user: {
    id: string
    email?: string | null
    name?: string | null
  }
}

export default async function DireccionesPage({ params }: PageProps) {
  const { lang } = await params

  // 🔐 Forzamos el tipo para que TS sepa que hay user.id
  const session = (await requireAuth()) as AuthSession

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <main className="container mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mis direcciones</h1>
        <p className="text-sm text-zinc-600">
          Gestiona tus direcciones de envío y facturación.
        </p>
      </header>

      {addresses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600">
          No tienes direcciones guardadas todavía.
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((addr) => (
            <li
              key={addr.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {/* Aquí puedes usar tus campos reales del modelo Address */}
                  <p className="font-medium">
                    {/* @ts-ignore si aún no tienes estos campos tipados */}
                    {addr.fullName ?? 'Dirección'}
                  </p>
                  <p className="text-zinc-600">
                    {/* @ts-ignore */}
                    {addr.line1} {/* @ts-ignore */}
                    {addr.line2 && `, ${addr.line2}`}
                  </p>
                  <p className="text-zinc-600">
                    {/* @ts-ignore */}
                    {addr.postalCode} {/* @ts-ignore */}
                    {addr.city} {/* @ts-ignore */}
                    {addr.province && `, ${addr.province}`}
                  </p>
                  {/* @ts-ignore */}
                  {addr.country && (
                    <p className="text-zinc-500 text-xs mt-1">{addr.country}</p>
                  )}
                </div>

                {/* @ts-ignore */}
                {addr.isDefault && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Predeterminada
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link
          href={`/${lang}/cuenta/direcciones/nueva`}
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Añadir nueva dirección
        </Link>
      </div>
    </main>
  )
}
