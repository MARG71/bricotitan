// src/app/(store)/[lang]/layout.tsx
import type { ReactNode } from 'react'
import Header from '@/components/store/Header'

type LayoutProps = {
  children: ReactNode
  params: Promise<{ lang: string }>
}

export default async function StoreLayout({ children, params }: LayoutProps) {
  const { lang } = await params // 👈 obligatorio en Next 15

  return (
    <div className="min-h-screen flex flex-col">
      <Header lang={lang} />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BRICOTITAN
      </footer>
    </div>
  )
}
