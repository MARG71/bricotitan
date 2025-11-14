// src/lib/format.ts
export function priceWithVat(priceExVat: number, vatRate?: number) {
  const rate = vatRate ?? 0
  const p = priceExVat * (1 + rate / 100)
  return Math.round(p * 100) / 100
}

export function formatPriceES(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatNumberES(value: number) {
  return new Intl.NumberFormat('es-ES').format(value)
}
