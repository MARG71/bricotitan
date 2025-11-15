// src/lib/catalog.ts
import { prisma } from '@/lib/prisma'
import type { Locale } from './i18n' // ⬅️ SOLO el tipo; si no existe, usa: type Locale = string

/** ==== Tipos para el front ==== */
export type ProductCard = {
  id: number
  slug: string
  ref: string | null
  brand: string | null
  priceExVat: number
  vatRate: number | null
  stock: number | null
  name: string
  imageUrl: string | null
}

export type CategoryLite = {
  id: number
  name: string
  slug: string
  parentId: number | null
}

export type CategoryFacets = {
  brands: string[]
  priceMin: number | null
  priceMax: number | null
  inStockCount: number
  totalCount: number
}

/** ==== Helpers internos ==== */
function pickI18nName(p: any, lang: Locale) {
  const exact = p.i18n?.find((t: any) => t.lang === lang)
  const fallback = p.i18n?.find((t: any) => t.lang === 'es')
  return exact?.name ?? fallback?.name ?? p.name ?? 'Producto'
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null
  return typeof v === 'number' ? v : Number(v)
}

function mapToProductCard(p: any, lang: Locale): ProductCard {
  return {
    id: p.id,
    slug: p.slug,
    ref: p.ref ?? null,
    brand: p.brand ?? null,
    priceExVat: toNum(p.priceExVat) ?? 0,
    vatRate: toNum(p.vatRate),
    stock: toNum(p.stock),
    name: pickI18nName(p, lang),
    imageUrl: (p.images?.[0]?.url as string | null) ?? null, // primera por sort asc
  }
}

/** ==== Obtener IDs de la categoría y TODAS sus descendientes ==== */
async function getDescendantCategoryIds(rootId: number): Promise<number[]> {
  const ids = new Set<number>([rootId])
  let frontier = [rootId]

  // Búsqueda iterativa (sin CTE). 5 niveles por seguridad.
  for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    })
    const newIds: number[] = []
    for (const c of children) {
      if (!ids.has(c.id)) {
        ids.add(c.id)
        newIds.push(c.id)
      }
    }
    frontier = newIds
  }

  return Array.from(ids)
}

/** ==== HOME: categorías destacadas + últimos productos ==== */
export async function getHomeData(langInput?: string) {
  const lang = ensureLocale(langInput)

  const topCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ name: 'asc' }],
    take: 8,
    select: { id: true, name: true, slug: true, parentId: true },
  })

  const latestProducts = await prisma.product.findMany({
    orderBy: [{ id: 'desc' }], // usa createdAt si lo tienes
    take: 12,
    include: {
      images: { orderBy: { sort: 'asc' }, take: 1 },
      i18n: { where: { lang: { in: [lang, 'es'] } } },
    },
  })

  const latestCards = latestProducts.map((p) => mapToProductCard(p, lang))
  return { topCategories: topCategories as CategoryLite[], latest: latestCards }
}

/** ==== Categoría por slug ==== */
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({ where: { slug } })
}

/** ==== Subcategorías directas de una categoría ==== */
export async function getChildCategories(parentSlug: string) {
  const parent = await prisma.category.findFirst({
    where: { slug: parentSlug },
    select: { id: true },
  })
  if (!parent) return []

  const children = await prisma.category.findMany({
    where: { parentId: parent.id },
    orderBy: [{ name: 'asc' }],
    select: { id: true, name: true, slug: true, parentId: true },
  })

  return children
}

/** ==== FACETS de categoría (brands, price range, stock count) ==== */
export async function getCategoryFacets(categorySlug: string): Promise<CategoryFacets> {
  const cat = await prisma.category.findFirst({
    where: { slug: categorySlug },
    select: { id: true },
  })
  if (!cat) return { brands: [], priceMin: null, priceMax: null, inStockCount: 0, totalCount: 0 }

  const categoryIds = await getDescendantCategoryIds(cat.id)
  const baseWhere: any = { categoryId: { in: categoryIds } }

  // Distinct brands (limpia null/empty)
  const brandRows = await prisma.product.findMany({
    where: baseWhere,
    distinct: ['brand'],
    select: { brand: true },
    orderBy: { brand: 'asc' },
  })
  const brands = brandRows
    .map((b) => b.brand?.trim())
    .filter((b): b is string => !!b && b.length > 0)

  // Price min / max (pueden ser Decimal)
  const agg = await prisma.product.aggregate({
    where: baseWhere,
    _min: { priceExVat: true },
    _max: { priceExVat: true },
  })
  const minRaw = agg._min.priceExVat
  const maxRaw = agg._max.priceExVat

  // Stock > 0 y total
  const [inStockCount, totalCount] = await Promise.all([
    prisma.product.count({ where: { ...baseWhere, stock: { gt: 0 } } }),
    prisma.product.count({ where: baseWhere }),
  ])

  return {
    brands,
    priceMin: minRaw == null ? null : toNum(minRaw)!,
    priceMax: maxRaw == null ? null : toNum(maxRaw)!,
    inStockCount,
    totalCount,
  }
}

/** ==== Listado por categoría con agrupación por idAgrupacion ==== */
export type CategoryQuery = {
  categorySlug: string
  lang?: string
  page?: number
  pageSize?: number
  filters?: {
    brand?: string[]
    inStock?: boolean
    priceMin?: number
    priceMax?: number
  }
  sort?: 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc' | 'newest'
}

export async function getProductsByCategory(q: CategoryQuery) {
  const lang = ensureLocale(q.lang)
  const page = Math.max(1, q.page ?? 1)
  const pageSize = Math.min(60, Math.max(1, q.pageSize ?? 24))

  // 1) Localizar la categoría raíz
  const category = await prisma.category.findFirst({
    where: { slug: q.categorySlug },
    select: { id: true },
  })
  if (!category) return { total: 0, items: [], page, pageSize, categoryId: null }

  const categoryIds = await getDescendantCategoryIds(category.id)

  // 2) Filtros
  const where: any = { categoryId: { in: categoryIds } }
  if (q.filters?.brand?.length) where.brand = { in: q.filters.brand }
  if (q.filters?.inStock) where.stock = { gt: 0 }
  if (q.filters?.priceMin != null || q.filters?.priceMax != null) {
    where.priceExVat = {}
    if (q.filters.priceMin != null) where.priceExVat.gte = q.filters.priceMin
    if (q.filters.priceMax != null) where.priceExVat.lte = q.filters.priceMax
  }

  // 3) Traer productos ordenados para poder quedarnos con el "principal" de cada grupo
  const raw = await prisma.product.findMany({
    where,
    orderBy: [{ idAgrupacion: 'asc' }, { ordenCombo: 'asc' }, { id: 'asc' }],
    include: {
      images: { orderBy: { sort: 'asc' }, take: 1 },
      i18n: { where: { lang: { in: [lang, 'es'] } } },
    },
  })

  // 4) Agrupar por idAgrupacion (o id si no tiene): primer elemento de cada grupo
  const groupedMap = new Map<number, any>()
  for (const p of raw) {
    const key = p.idAgrupacion ?? p.id
    if (!groupedMap.has(key)) groupedMap.set(key, p)
  }
  let grouped = Array.from(groupedMap.values())

  // 5) Ordenar tarjetas a nivel de lista (según sort pedido)
  const toNumSafe = (v: any) => (typeof v === 'number' ? v : Number(v) || 0)
  grouped = grouped.sort((a, b) => {
    switch (q.sort) {
      case 'priceAsc':
        return toNumSafe(a.priceExVat) - toNumSafe(b.priceExVat)
      case 'priceDesc':
        return toNumSafe(b.priceExVat) - toNumSafe(a.priceExVat)
      case 'nameAsc':
        return (a.slug ?? '').localeCompare(b.slug ?? '')
      case 'nameDesc':
        return (b.slug ?? '').localeCompare(a.slug ?? '')
      case 'newest':
      default:
        return b.id - a.id
    }
  })

  // 6) Paginación DESPUÉS de agrupar
  const total = grouped.length
  const start = (page - 1) * pageSize
  const pageSlice = grouped.slice(start, start + pageSize)

  const items = pageSlice.map((p) => mapToProductCard(p, lang))
  return { total, items, page, pageSize, categoryId: category.id }
}

/** ==== Normalizador de locale ==== */
function ensureLocale(lang?: string): Locale {
  return (lang ?? 'es').toLowerCase() as Locale
}

/** ==== Detalle de producto por slug ==== */
export async function getProductBySlug(slug: string, lang: string) {
  try {
    // Busca el producto por slug (único)
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sort: 'asc' } },
        bullets: { orderBy: { sort: 'asc' } },
        i18n: {
          where: { lang },
          orderBy: { id: 'asc' },
          take: 1,
        },
      },
    })

    // Si no existe, devolvemos null
    if (!product) return { product: null }

    const i18n = product.i18n?.[0] ?? null
    const i18nName = i18n?.name ?? product.name ?? null

    // Variantes (productos con mismo idAgrupacion)
    let variantes = []
    if (product.idAgrupacion) {
      variantes = await prisma.product.findMany({
        where: { idAgrupacion: product.idAgrupacion },
        select: { id: true, slug: true, name: true, ordenCombo: true },
        orderBy: [{ ordenCombo: 'asc' }],
      })
    }

    // Relacionados (por XREF tipo 'related')
    const relatedXrefs = await prisma.productXref.findMany({
      where: { fromId: product.id, kind: 'related' },
      include: {
        to: {
          include: {
            images: { orderBy: { sort: 'asc' }, take: 1 },
          },
        },
      },
    })

    const related = relatedXrefs.map((x) => {
      const pr = x.to
      const firstImg = pr?.images?.[0]
      return {
        id: pr.id,
        slug: pr.slug,
        name: pr.name,
        priceExVat: pr.priceExVat,
        imageUrl: firstImg?.url ?? null,
        cloudinaryPublicId: firstImg?.cloudinaryPublicId ?? null,
      }
    })

    return {
      product,
      i18nName,
      comboTitle: product.tituloCombo ?? null,
      variantes,
      related,
      i18n,
    }
  } catch (err) {
    console.error('[getProductBySlug] Error:', err)
    return { product: null }
  }
}

/** ==== Docs para el buscador ==== */
export type SearchDoc = {
  id: string
  slug: string
  title: string
  description?: string
  category: string // slug de top-level o el actual si no hay padre
  subcategory?: string | null // slug del segundo nivel si aplica
  brand?: string | null
  price: number // precio con IVA si hay vatRate, si no, exVAT
  priceExVat: number // para filtros si quieres
  salePrice?: number | null // no lo tienes: dejamos null
  inStock: boolean
  rating?: number | null // no lo tienes: null
  tags?: string[]
  attributes?: Record<string, any>
  imageUrl?: string | null
  createdAt?: string | undefined
  updatedAt?: string | undefined
}

export async function getAllProductsForSearch(langInput?: string): Promise<SearchDoc[]> {
  const lang = ensureLocale(langInput)

  const rows = await prisma.product.findMany({
    orderBy: { id: 'desc' }, // cambia a createdAt si la tienes
    include: {
      images: { orderBy: { sort: 'asc' }, take: 1 },
      i18n: { where: { lang: { in: [lang, 'es'] } } },
      category: {
        select: {
          slug: true,
          parent: { select: { slug: true } },
        },
      },
    },
  })

  return rows.map((p: any) => {
    const displayName = pickI18nName(p, lang)
    const parentSlug = p.category?.parent?.slug ?? null
    const catSlug = p.category?.slug ?? 'general'

    // Si hay padre: category = padre, subcategory = actual
    // Si no hay padre: category = actual, subcategory = null
    const category = parentSlug ?? catSlug
    const subcategory = parentSlug ? catSlug : null

    const priceExVat = toNum(p.priceExVat) ?? 0
    const vatRate = toNum(p.vatRate) // porcentaje (p.ej. 21)
    const price =
      vatRate == null ? priceExVat : Math.round(priceExVat * (1 + vatRate / 100) * 100) / 100

    return {
      id: String(p.id),
      slug: p.slug,
      title: displayName,
      description: undefined, // si tienes descripción i18n, añádela aquí
      category,
      subcategory,
      brand: p.brand ?? null,
      price,
      priceExVat,
      salePrice: null,
      inStock: (p.stock ?? 0) > 0,
      rating: null,
      tags: [],
      attributes: {},
      imageUrl: (p.images?.[0]?.url as string | null) ?? null,
      createdAt: p.createdAt?.toISOString?.(),
      updatedAt: p.updatedAt?.toISOString?.(),
    }
  })
}
