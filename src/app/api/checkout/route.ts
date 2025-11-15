import { NextResponse } from 'next/server' 
import { getServerAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { computeTotals, CartLineInput } from '@/lib/orders/totals'

export async function POST(req: Request) {
  // 👇 Forzamos el tipo para que TS no lo infiera como {}
  const session: any = await getServerAuth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { lang = 'es' } = Object.fromEntries(new URL(req.url).searchParams)
  const body = await req.json().catch(() => null)
  const lines = (body?.lines ?? []) as CartLineInput[]
  const addressId = body?.addressId as number | undefined

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'EMPTY_CART' }, { status: 400 })
  }

  // Totales
  const t = computeTotals(lines)

  // Crear Order(PENDING) con snapshot
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      addressId,
      status: 'PENDING',
      currency: t.currency,
      subtotal: t.subtotal,
      taxTotal: t.taxTotal,
      shippingTotal: t.shippingTotal,
      total: t.total,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId ?? null,
          ref: l.ref,
          title: l.title,
          qty: l.qty,
          priceExVat: l.priceExVat,
          vatRate: l.vatRate,
          lineTotal: +((l.priceExVat * (1 + l.vatRate / 100)) * l.qty).toFixed(2),
        })),
      },
    },
    select: { id: true, total: true, currency: true },
  })

  // Stripe line items (precios con IVA incluidos)
  const stripeLineItems = computeTotals(lines).lines.map((l) => ({
    quantity: l.qty,
    price_data: {
      currency: t.currency.toLowerCase(),
      product_data: { name: `${l.title} (${l.ref})` },
      unit_amount_decimal: Math.round(l.unitIncVat * 100), // en céntimos
    },
  }))

  const successUrl = `${process.env.NEXTAUTH_URL}/${lang}/cuenta/pedidos/${order.id}?ok=1`
  const cancelUrl = `${process.env.NEXTAUTH_URL}/${lang}/carrito?cancel=1`

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: stripeLineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: order.id, userId: session.user.id },
  })

  return NextResponse.json({ checkoutUrl: checkout.url, orderId: order.id })
}
