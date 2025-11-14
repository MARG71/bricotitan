// src/app/layout.tsx
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { ReactNode } from 'react'
import SessionProvider from '@/components/providers/SessionProvider'

const manrope = Manrope({ subsets: ['latin'], weight: ['400','600','700'] })

export const metadata: Metadata = {
  title: 'BRICOTITAN — Ferretería Online',
  description: 'Catálogo de ferretería BRICOTITAN',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}