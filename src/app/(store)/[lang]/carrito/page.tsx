'use client'


import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type CartLine = {
  productId?: number
  ref: string
  title: string
  qty: number
  priceExVat: number
  vatRate: number
}

function money(n?: number) {
  return Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
}

export default function CartPage({ params }: { params: { lang: string } }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(false)
  const { lang } = useParams<{ lang: string }>()  // 👈 idioma desde la URL

  useEffect(() => {
    const raw = localStorage.getItem('cart')
    setLines(raw ? JSON.parse(raw) : [])
  }, [])

  const totals = (() => {
    let subtotal = 0, taxTotal = 0
    lines.forEach(l => {
      subtotal += l.priceExVat * l.qty
      taxTotal += l.priceExVat * (l.vatRate/100) * l.qty
    })
    const total = subtotal + taxTotal
    return {
      subtotal: +subtotal.toFixed(2),
      taxTotal: +taxTotal.toFixed(2),
      total: +total.toFixed(2),
    }
  })()

  async function pay() {
    if (lines.length === 0) return
    setLoading(true)
    try {
      
      const res = await fetch(`/api/checkout?lang=${lang}`, {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const data = await res.json()
      window.location.href = data.checkoutUrl
    } catch (e) {
      alert('No se pudo iniciar el pago. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function remove(idx: number) {
    const n = lines.filter((_, i) => i !== idx)
    setLines(n)
    localStorage.setItem('cart', JSON.stringify(n))
  }

  if (lines.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Tu carrito</h1>
        <div className="rounded-xl border p-4 text-sm text-gray-600">Tu carrito está vacío.</div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Tu carrito</h1>

      <div className="grid gap-6 md:grid-cols-[1fr,320px]">
        <div className="rounded-xl border divide-y">
          {lines.map((l, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{l.title}</div>
                <div className="text-gray-600">Ref: {l.ref} · {l.qty} ud. · IVA {l.vatRate}%</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{money((l.priceExVat*(1+l.vatRate/100))*l.qty)}</div>
                <button
                  onClick={() => remove(i)}
                  className="mt-2 text-xs rounded border px-2 py-1 hover:bg-gray-50"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-xl border p-4">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="font-semibold mb-2">{money(totals.subtotal)}</div>
          <div className="text-sm text-gray-600">IVA</div>
          <div className="font-semibold mb-4">{money(totals.taxTotal)}</div>
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold mb-4">{money(totals.total)}</div>
          <button
            disabled={loading}
            onClick={pay}
            className="w-full rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Creando pago…' : 'Pagar con Stripe'}
          </button>
        </aside>
      </div>
    </main>
  )
}
