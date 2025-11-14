import { getProductsIndex } from '@/lib/meili'
import Link from 'next/link'
import ProductCard from '@/components/store/ProductCard' // 👈 IMPORT CORRECTO

// Next 15: params y searchParams son Promises
type PageProps = {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[]>>
}

function toArray(v: string | string[] | undefined) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v === '1' || v?.toLowerCase() === 'true') return true
  if (v === '0' || v?.toLowerCase() === 'false') return false
  return undefined
}

function buildFilter(sp: Record<string, string | string[]>) {
  const filters: string[] = []

  const category = typeof sp.category === 'string' ? sp.category : undefined
  const subcategory = typeof sp.subcategory === 'string' ? sp.subcategory : undefined
  const brands = toArray(sp.brand)
  const inStock = parseBool(sp.inStock as string | undefined)
  const priceMin = sp.priceMin ? Number(sp.priceMin) : undefined
  const priceMax = sp.priceMax ? Number(sp.priceMax) : undefined

  if (category) filters.push(`category = "${category}"`)
  if (subcategory) filters.push(`subcategory = "${subcategory}"`)
  if (brands.length) filters.push(`brand IN [${brands.map((b) => `"${b}"`).join(', ')}]`)
  if (inStock === true) filters.push(`inStock = true`)
  if (priceMin != null && !Number.isNaN(priceMin)) filters.push(`price >= ${priceMin}`)
  if (priceMax != null && !Number.isNaN(priceMax)) filters.push(`price <= ${priceMax}`)

  return filters.length ? filters.join(' AND ') : undefined
}

function buildSort(sort?: string) {
  switch (sort) {
    case 'priceAsc':
      return ['price:asc']
    case 'priceDesc':
      return ['price:desc']
    case 'ratingDesc':
      return ['rating:desc']
    default:
      return ['createdAt:desc'] // newest
  }
}

function keep(params: Record<string, string | string[]>, patch: Record<string, string | undefined>) {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => u.append(k, String(x)))
    else if (v != null) u.set(k, String(v))
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) u.delete(k)
    else u.set(k, v)
  }
  return u.toString()
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { lang } = await params
  const sp = await searchParams

  const q = (sp.q as string) ?? ''
  const page = Math.max(1, Number(sp.page ?? '1'))
  const pageSize = Math.min(60, Math.max(1, Number(sp.pageSize ?? '24')))
  const sort = (sp.sort as string | undefined) ?? 'newest'

  const index = await getProductsIndex()

  const res = await index.search(q, {
    page,
    hitsPerPage: pageSize,
    sort: buildSort(sort),
    filter: buildFilter(sp),
    // 👇 MUY IMPORTANTE: pedir estos campos
    attributesToRetrieve: [
      'id',
      'slug',
      'title',
      'brand',
      'imageUrl',
      'price',
      'salePrice',
      'inStock',
      'rating',
      'category',
      'subcategory',
    ],
    attributesToHighlight: ['title', 'brand'],
    attributesToCrop: ['description'],
    cropLength: 20,
    showMatchesPosition: false,
    facets: ['category', 'subcategory', 'brand', 'inStock'],
  })

  // 👇 Filtramos hits incompletos para no romper la card
  const rawHits = (res.hits as any[]) ?? []
  const hits = rawHits.filter((h) => h && h.slug && h.title)
  const facet = (res.facetDistribution as any) ?? {}

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Título + buscador */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Buscar</h1>

        <form className="flex w-full md:w-1/2 gap-2" action={`/${lang}/buscar`} method="get">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar productos (p. ej. taladro, destornillador...)"
            className="flex-1 rounded-xl border px-4 py-2"
          />
          <input type="hidden" name="sort" value={sort} />
          <button className="rounded-xl border px-4 py-2 hover:bg-gray-50">Buscar</button>
        </form>
      </div>

      {/* Contenido */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: filtros */}
        <aside className="rounded-2xl border p-4">
          <h2 className="font-medium mb-3">Filtros</h2>

          <form className="space-y-4" action={`/${lang}/buscar`} method="get">
            {/* Mantener lo actual */}
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="sort" value={sort} />

            {/* En stock */}
            <div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="inStock" value="1" defaultChecked={(sp.inStock as string) === '1'} />
                <span>Solo en stock</span>
              </label>
            </div>

            {/* Precio */}
            <div className="flex gap-2">
              <input
                type="number"
                name="priceMin"
                placeholder="€ mín"
                defaultValue={(sp.priceMin as string) ?? ''}
                className="w-1/2 rounded-xl border px-3 py-2"
              />
              <input
                type="number"
                name="priceMax"
                placeholder="€ máx"
                defaultValue={(sp.priceMax as string) ?? ''}
                className="w-1/2 rounded-xl border px-3 py-2"
              />
            </div>

            {/* Marcas */}
            {facet.brand && (
              <div>
                <h3 className="text-sm font-medium mb-2">Marcas</h3>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {Object.entries(facet.brand as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 50)
                    .map(([brand, count]) => {
                      const selected = toArray(sp.brand).includes(brand)
                      return (
                        <label key={brand} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="brand" value={brand} defaultChecked={selected} />
                          <span>{brand}</span>
                          <span className="ml-auto text-xs text-gray-500">{count}</span>
                        </label>
                      )
                    })}
                </div>
              </div>
            )}

            <button className="mt-2 w-full rounded-xl border px-4 py-2 hover:bg-gray-50">Aplicar filtros</button>
          </form>
        </aside>

        {/* Lista + orden */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {res.totalHits} resultado{res.totalHits === 1 ? '' : 's'}
            </p>
            <form action={`/${lang}/buscar`} method="get" className="flex items-center gap-2">
              {/* Mantener q y filtros */}
              {Object.entries(sp).map(([k, v]) => {
                if (k === 'sort') return null
                if (Array.isArray(v)) {
                  return v.map((vv, i) => <input key={`${k}-${i}`} type="hidden" name={k} value={String(vv)} />)
                }
                return <input key={k} type="hidden" name={k} value={String(v)} />
              })}
              <select name="sort" defaultValue={sort} className="rounded-xl border px-3 py-2">
                <option value="newest">Más recientes</option>
                <option value="priceAsc">Precio: de menor a mayor</option>
                <option value="priceDesc">Precio: de mayor a menor</option>
                <option value="ratingDesc">Mejor valorados</option>
              </select>
              <button className="rounded-xl border px-3 py-2 hover:bg-gray-50">Ordenar</button>
            </form>
          </div>

          {/* GRID de productos */}
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hits.map((h) => (
              <ProductCard
                key={h.id ?? h.slug}
                lang={lang}
                hit={{
                  id: h.id,
                  slug: h.slug,
                  title: h.title,
                  brand: h.brand,
                  imageUrl: h.imageUrl,
                  price: h.price,
                  salePrice: h.salePrice,
                  inStock: h.inStock,
                  rating: h.rating,
                }}
              />
            ))}
          </ul>

          {/* Paginación */}
          {res.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link className="rounded-xl border px-3 py-2 hover:bg-gray-50" href={`/${lang}/buscar?${keep(sp, { page: String(page - 1) })}`}>
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-gray-600">
                Página {page} de {res.totalPages}
              </span>
              {page < res.totalPages && (
                <Link className="rounded-xl border px-3 py-2 hover:bg-gray-50" href={`/${lang}/buscar?${keep(sp, { page: String(page + 1) })}`}>
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
