/* eslint-disable no-console */
import { prisma } from '../src/lib/prisma'

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!user) {
    console.log('No hay usuario ADMIN; crea uno antes de seed de pedidos.')
    return
  }

  // Crea una dirección si no tiene
  const address = await prisma.address.findFirst({ where: { userId: user.id } }) ?? await prisma.address.create({
    data: {
      userId: user.id,
      name: 'Casa',
      fullName: user.name ?? 'Admin Bricotitan',
      line1: 'Calle Mayor 1',
      line2: '3ºA',
      city: 'Madrid',
      region: 'Madrid',
      postal: '28001',
      country: 'ES',
      phone: '600000000',
      isDefault: true,
    }
  })

  // Pedido de prueba
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      addressId: address.id,
      status: 'PAID',
      currency: 'EUR',
      subtotal: 100,
      taxTotal: 21,
      shippingTotal: 0,
      total: 121,
      paidAt: new Date(),
      lines: {
        create: [
          { ref: 'REF-TEST-1', title: 'Producto Demo 1', qty: 1, priceExVat: 60, vatRate: 21, lineTotal: 72.6 },
          { ref: 'REF-TEST-2', title: 'Producto Demo 2', qty: 2, priceExVat: 20, vatRate: 21, lineTotal: 48.4 },
        ]
      }
    }
  })

  // Factura demo
  await prisma.invoice.create({
    data: {
      orderId: order.id,
      number: 'INV-000001',
      total: order.total,
    }
  })

  console.log('Pedido de prueba creado:', order.id)
}

main().catch(e => { console.error(e); process.exit(1) })
