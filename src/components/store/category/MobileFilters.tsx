'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export type MobileFiltersProps = {
  brands: string[]
  priceMin: number | null
  priceMax: number | null
}

/**
 * Panel de filtros para móvil (md:hidden).
 * Abre un overlay con el mismo comportamiento de URL que el sidebar.
 */
export default function MobileFilters({ brands, priceMin, priceMax }: MobileFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)

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
    setOpen(false)
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
    <>
      {/* Botón que solo se ve en móvil */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border px-4 py-2 bg-white text-zinc-900"
        >
          Mostrar filtros
        </button>
      </div>

      {/* Overlay + panel deslizante */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-zinc-900">Filtros</h3>
              <button
                className="text-sm text-zinc-600 hover:text-brand-primary"
                onClick={clearAll}
                type="button"
              >
                Limpiar
              </button>
            </div>

            <form onSubmit={applyFilters} className="flex-1 overflow-auto p-4 space-y-6 text-zinc-900">
              {/* En stock */}
              <div className="flex items-center gap-2">
                <input
                  id="m-inStock"
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                />
                <label htmlFor="m-inStock" className="text-sm">Solo en stock</label>
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
                <div className="max-h-80 space-y-1 overflow-auto pr-1">
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

              <div className="sticky bottom-0 bg-white pt-2">
                <button type="submit" className="btn w-full">Aplicar filtros</button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-2 w-full rounded-xl border px-4 py-2"
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
