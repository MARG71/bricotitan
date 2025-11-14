export type CartLineInput = {
  productId?: number
  ref: string
  title: string
  qty: number
  priceExVat: number // € sin IVA
  vatRate: number    // %
}

export function computeTotals(lines: CartLineInput[]) {
  let subtotal = 0
  let taxTotal = 0
  const norm = lines.map((l) => {
    const unitTax = +(l.priceExVat * (l.vatRate / 100)).toFixed(2)
    const unitIncVat = +(l.priceExVat + unitTax).toFixed(2)
    const lineTotal = +(unitIncVat * l.qty).toFixed(2)
    subtotal += +(l.priceExVat * l.qty).toFixed(2)
    taxTotal += +(unitTax * l.qty).toFixed(2)
    return { ...l, unitIncVat, lineTotal }
  })
  const shippingTotal = 0
  const total = +(subtotal + taxTotal + shippingTotal).toFixed(2)
  return { lines: norm, subtotal, taxTotal, shippingTotal, total, currency: 'EUR' as const }
}
