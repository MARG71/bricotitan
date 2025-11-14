'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export type FiltersProps = {
  brands: string[]
  priceMin: number | null
  priceMax: number | null
}

export default function Filters({ brands, priceMin, priceMax }: FiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Estado inicial desde URL
  const selectedBrands = useMemo(() => searchParams.getAll('brand'), [searchParams])
  const [inStock, setInStock] = useState(searchParams.get('inStock') === '1')
  const [min, setMin] = useState<string>(searchParams.get('priceMin') ?? '')
  const [max, setMax] = useState<string>(searchParams.get('priceMax') ?? '')

  useEffect(() => {
    setInStock(searchParams.get('inStock') === '1')
    setMin(searchParams.get('priceMin') ?? '')
    setMax(searchParams.get('priceMax') ?? '')
  }, [searchParams])

  function toggleBrand(b: string) {
    const params = new URLSearchParams(searchParams.toString())
    const current = new Set(params.getAll('brand'))
    if (current.has(b)) current.delete(b)
    else current.add(b)
    params.delete('brand')
    for (const v of current) params.append('brand', v)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (inStock) params.set('inStock', '1')
    else params.delete('inStock')

    if (min) params.set('priceMin', min)
    else params.delete('priceMin')

    if (max) params.set('priceMax', max)
    else params.delete('priceMax')

    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('brand')
    params.delete('inStock')
    params.delete('priceMin')
    params.delete('priceMax')
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <aside className="md:col-span-3 md:sticky md:top-4 md:self-start">
      <form
        onSubmit={applyFilters}
        className="space-y-6 rounded-2xl border bg-white p-4 text-zinc-900 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filtros</h3>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-zinc-600 hover:text-brand-primary"
          >
            Limpiar
          </button>
        </div>

        {/* En stock */}
        <div className="flex items-center gap-2">
          <input
            id="inStock"
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          <label htmlFor="inStock" className="text-sm">Solo en stock</label>
        </div>

        {/* Precio */}
        <div>
          <div className="mb-2 text-sm font-medium">Precio (sin IVA)</div>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              placeholder={priceMin != null ? String(priceMin) : 'min'}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
            />
            <span className="text-zinc-500">—</span>
            <input
              inputMode="decimal"
              placeholder={priceMax != null ? String(priceMax) : 'max'}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Marcas */}
        <div>
          <div className="mb-2 text-sm font-medium">Marcas</div>
          <div className="max-h-72 space-y-1 overflow-auto pr-1">
            {brands.length === 0 && (
              <div className="text-sm text-zinc-500">No hay marcas</div>
            )}
            {brands.map((b) => {
              const checked = selectedBrands.includes(b)
              return (
                <label key={b} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBrand(b)}
                  />
                  <span>{b}</span>
                </label>
              )
            })}
          </div>
        </div>

        <button type="submit" className="btn w-full">Aplicar filtros</button>
      </form>
    </aside>
  )
}
