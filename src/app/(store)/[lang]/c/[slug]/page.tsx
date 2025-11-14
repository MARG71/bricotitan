// src/app/(store)/[lang]/c/[slug]/page.tsx
import Link from 'next/link'
import ProductCard from '@/components/store/ProductCard'
import { getCategoryBySlug, getCategoryFacets, getProductsByCategory } from '@/lib/catalog'

type PageProps = {
  params: Promise<{ lang: string; slug: string }>
  searchParams: Promise<Record<string, string | string[]>>
}

function toArray(v: string | string[] | undefined) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { lang, slug } = await params           // 👈 obligatorio
  const sp = await searchParams                 // 👈 obligatorio

  const page = Math.max(1, Number(sp.page ?? '1'))
  const pageSize = Math.min(60, Math.max(1, Number(sp.pageSize ?? '24')))
  const sort = (sp.sort as 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc' | 'newest' | undefined) ?? 'newest'

  // Normalizar filtros desde la URL
  const brandParam = sp.brand
  const brandsSelected = toArray(brandParam)
  const inStock = (sp.inStock as string) === '1'
  const priceMin = sp.priceMin ? Number(sp.priceMin) : undefined
  const priceMax = sp.priceMax ? Number(sp.priceMax) : undefined

  // Datos de la categoría + facets
  const category = await getCategoryBySlug(slug)
  if (!category) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold">Categoría no encontrada</h1>
        <Link className="text-brand-primary underline" href={`/${lang}`}>Volver al inicio</Link>
      </div>
    )
  }

  const facets = await getCategoryFacets(slug)

  // Listado de productos
  const { total, items } = await getProductsByCategory({
    categorySlug: slug,
    lang,
    page,
    pageSize,
    sort,
    filters: {
      brand: brandsSelected.length ? brandsSelected : undefined,
      inStock: inStock || undefined,
      priceMin,
      priceMax,
    },
  })

  // Helper para mantener querystring
  function keep(patch: Record<string, string | undefined>) {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      if (Array.isArray(v)) v.forEach((x) => u.append(k, String(x)))
      else if (v != null) u.set(k, String(v))
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) u.delete(k)
      else u.set(k, v)
    }
    return u.toString()
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      <p className="text-sm text-gray-500 mt-1">{total} productos encontrados</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar de filtros */}
        <aside className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium mb-3">Filtros</h2>
            <Link href={`/${lang}/c/${slug}`} className="text-sm text-gray-500 hover:underline">Limpiar</Link>
          </div>

          <form className="space-y-4" action={`/${lang}/c/${slug}`} method="get">
            {/* En stock */}
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="inStock" value="1" defaultChecked={inStock} />
              <span>Solo en stock</span>
            </label>

            {/* Precio */}
            <div className="flex gap-2">
              <input
                type="number"
                name="priceMin"
                placeholder={`${facets.priceMin ?? ''}`}
                defaultValue={(sp.priceMin as string) ?? ''}
                className="w-1/2 rounded-xl border px-3 py-2"
              />
              <input
                type="number"
                name="priceMax"
                placeholder={`${facets.priceMax ?? ''}`}
                defaultValue={(sp.priceMax as string) ?? ''}
                className="w-1/2 rounded-xl border px-3 py-2"
              />
            </div>

            {/* Marcas */}
            {facets.brands.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Marcas</h3>
                <div className="max-h-56 overflow-auto pr-1 space-y-1">
                  {facets.brands.map((b) => {
                    const selected = brandsSelected.includes(b)
                    return (
                      <label key={b} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="brand" value={b} defaultChecked={selected} />
                        <span>{b}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <button className="mt-2 w-full rounded-xl border px-4 py-2 hover:bg-gray-50">Aplicar filtros</button>
          </form>
        </aside>

        {/* Listado + orden */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div />
            <form action={`/${lang}/c/${slug}`} method="get" className="flex items-center gap-2">
              {/* Mantener filtros actuales */}
              {Object.entries(sp).map(([k, v]) => {
                if (k === 'sort') return null
                if (Array.isArray(v)) return v.map((vv, i) => <input key={`${k}-${i}`} type="hidden" name={k} value={String(vv)} />)
                return <input key={k} type="hidden" name={k} value={String(v)} />
              })}
              <select name="sort" defaultValue={sort} className="rounded-xl border px-3 py-2">
                <option value="newest">Novedades</option>
                <option value="priceAsc">Precio ↑</option>
                <option value="priceDesc">Precio ↓</option>
                <option value="nameAsc">Nombre A–Z</option>
                <option value="nameDesc">Nombre Z–A</option>
              </select>
              <button className="rounded-xl border px-3 py-2 hover:bg-gray-50">Ordenar</button>
            </form>
          </div>

  

          {/* GRID de productos — 👇 aquí pasamos item (formato BD) */}
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => (
              <ProductCard key={p.id} lang={lang} item={p} />
            ))}
          </ul>

          {/* Paginación */}
          {/* Si necesitas, añade aquí paginación con keep({ page: ... }) usando el total/pageSize */}
        </section>
      </div>
    </div>
  )
}
