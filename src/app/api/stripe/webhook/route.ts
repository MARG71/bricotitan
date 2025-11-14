import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count()
  const seq = count + 1
  return `INV-${String(seq).padStart(6, '0')}`
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')
  if (!sig) return new NextResponse('Missing signature', { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const cs = event.data.object as any
    const orderId = cs.metadata?.orderId as string | undefined
    if (orderId) {
      // Idempotente: actualiza solo si sigue pendiente
      const updated = await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId: cs.payment_intent ?? null,
          stripeCustomerId: cs.customer ?? null,
        },
      })

      // Crea factura si no existe ya
      const hasInvoice = await prisma.invoice.findUnique({ where: { orderId } })
      if (!hasInvoice) {
        const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true } })
        if (order) {
          await prisma.invoice.create({
            data: {
              orderId,
              number: await nextInvoiceNumber(),
              total: order.total,
            },
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}

export const config = {
  api: { bodyParser: false },
}
