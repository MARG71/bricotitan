// src/lib/generateSlugs.ts
import { prisma } from './prisma'

/**
 * Tipo mínimo que necesitamos para generar un slug
 */
type ProductForSlug = {
  id: number
  name: string | null
  ref: string | null
  slug: string | null
}

/**
 * Convierte un texto en slug básico: minúsculas, sin acentos, espacios -> '-'
 */
function slugify(raw: string): string {
  return raw
    .toString()
    .normalize('NFKD') // quita acentos
    .replace(/[\u0300-\u036f]/g, '') // restos de diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // todo lo que no sea [a-z0-9] => '-'
    .replace(/^-+|-+$/g, '') // quita guiones al principio/fin
}

/**
 * Elige un título razonable para el slug:
 * - nombre del producto
 * - o la ref
 * - o un fallback con el id
 */
function pickTitle(p: ProductForSlug): string {
  if (p.name && p.name.trim().length > 0) return p.name.trim()
  if (p.ref && p.ref.trim().length > 0) return p.ref.trim()
  return `producto-${p.id}`
}

/**
 * Genera un slug único "barato": slug-base + sufijo con ref o id.
 * Soporta que el segundo parámetro sea o el producto entero o solo el id.
 */
function makeUniqueSlug(
  title: string,
  productOrId: { id: number; ref?: string | null } | number
): string {
  const base = slugify(title)

  let id: number
  let ref: string | null | undefined

  if (typeof productOrId === 'number') {
    id = productOrId
    ref = undefined
  } else {
    id = productOrId.id
    ref = productOrId.ref
  }

  // Si hay ref, la usamos; si no, usamos el id
  const suffix = ref && ref.trim().length > 0 ? `-${ref.trim()}` : `-${id}`

  return `${base}${suffix}`
}

/**
 * Devuelve productos sin slug para poder revisarlos / loguearlos
 */
export async function findProductsWithoutSlug(): Promise<ProductForSlug[]> {
  const products = await prisma.product.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      ref: true,
      slug: true,
    },
    orderBy: { id: 'asc' },
  })

  return products
}

/**
 * Genera slugs para todos los productos que no tengan.
 * Pensado para usarse desde scripts tipo:
 *   ts-node scripts/fix-missing-slugs.ts
 */
export async function generateMissingSlugs(): Promise<void> {
  const products = await findProductsWithoutSlug()

  if (products.length === 0) {
    console.log('✅ No hay productos sin slug.')
    return
  }

  console.log(`🔧 Generando slugs para ${products.length} productos sin slug...`)

  for (const p of products) {
    const title = pickTitle(p)
    // ⬅️ AQUÍ usamos el producto completo, no solo p.id
    const slug = makeUniqueSlug(title, { id: p.id, ref: p.ref ?? undefined })

    await prisma.product.update({
      where: { id: p.id },
      data: { slug },
    })

    console.log(` - [${p.id}] ${title} -> ${slug}`)
  }

  console.log('✅ Slugs generados correctamente.')
}
