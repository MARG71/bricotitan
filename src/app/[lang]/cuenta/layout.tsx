import { ReactNode } from 'react'
import Link from 'next/link'

export default async function CuentaLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  const Item = ({ href, children: label }: { href: string; children: ReactNode }) => (
    <Link href={`/${lang}/cuenta/${href}`} className="block rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
      {label}
    </Link>
  )

  return (
    <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-[220px,1fr]">
      <aside className="space-y-2">
        <Item href="perfil">Perfil</Item>
        <Item href="direcciones">Direcciones</Item>
        <Item href="pedidos">Pedidos</Item>
        <Item href="facturas">Facturas</Item>
        <Item href="historial">Historial</Item>
      </aside>
      <section>{children}</section>
    </div>
  )
}
