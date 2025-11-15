import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductBySlug } from '@/lib/catalog'
import VariantSelector from './VariantSelector' // ⬅️ componente cliente
import { cldUrl } from '@/lib/cloudinaryUrl';
import ProductGallery from '@/components/store/ProductGallery';

// -----------------------------
// Utils: Decimal | string | number -> number | null
function toNum(x: unknown): number | null {
  if (x === null || x === undefined) return null
  // Prisma Decimal suele exponer .toNumber()
  // @ts-ignore
  if (typeof (x as any)?.toNumber === 'function') return (x as any).toNumber() as number
  const n = Number(x as any)
  return Number.isFinite(n) ? n : null
}

// -----------------------------
// Tipos auxiliares para bullets (normalización segura)
type BulletJson = { id?: number | string; text?: string | null; sort?: number | null }
type BulletNorm = { id: string; text: string; sort: number }

function isBulletJsonArray(x: unknown): x is BulletJson[] {
  return Array.isArray(x) && x.every(e => e && typeof e === 'object')
}

function normalizeJsonBullets(x: unknown): BulletNorm[] {
  if (!isBulletJsonArray(x)) return []
  return x
    .map((b, i) => ({
      id: String(b.id ?? i),
      text: b.text ?? '',
      sort: b.sort ?? 0,
    }))
    .sort((a, b) => a.sort - b.sort)
}

function normalizeRelBullets(x: unknown): BulletNorm[] {
  // Para ProductBullet[] de relación: { id: number; text: string; sort: number }
  if (!Array.isArray(x)) return []
  return x
    .filter(b => b && typeof b === 'object')
    .map((b: any) => ({
      id: String(b.id ?? ''),
      text: String(b.text ?? ''),
      sort: Number.isFinite(b.sort) ? Number(b.sort) : 0,
    }))
    .sort((a, b) => a.sort - b.sort)
}

// Intenta obtener bullets primero de relación (Product.bullets), si no hay, del JSON i18n
function getUnifiedBullets(product: any, i18n: unknown): BulletNorm[] {
  const rel = normalizeRelBullets(product?.bullets)
  if (rel.length > 0) return rel

  const i18nBulletsSource =
    (i18n as any)?.bullets ??
    (Array.isArray((i18n as any)) ? (i18n as any)[0]?.bullets : undefined)

  const intl = normalizeJsonBullets(i18nBulletsSource)
  return intl
}

// -----------------------------
// Next.js params
// -----------------------------
// Next.js params
type ProductPageParams = { lang: string; slug: string }
type ProductPageProps = { params: ProductPageParams }

// -----------------------------
// SEO
export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {

  const { lang, slug } = params
  const data = await getProductBySlug(slug, lang)
  if (!data?.product) return {}

  const title = data.i18nName || data.product.name || 'Producto'
  const desc =
    data.product.shortDesc ||
    data.product.longDesc ||
    `Compra ${title} en Bricotitan`

  const firstImg = data.product.images?.[0]
  const ogUrl = firstImg
    ? cldUrl(firstImg.cloudinaryPublicId, firstImg.url, { width: 1200 })
    : undefined

  return {
    title: `${title} | Bricotitan`,
    description: desc,
    openGraph: {
      title: `${title} | Bricotitan`,
      description: desc,
      images: ogUrl ? [{ url: ogUrl }] : undefined,
    },
  }
} 

// -----------------------------
// Page (Server Component)
export default async function ProductPage({ params }: ProductPageProps) {

  const { lang, slug } = params
  const data = await getProductBySlug(slug, lang)
  if (!data?.product) notFound()

  const p = data.product

  // Normalizaciones para evitar renderizar Decimals
  const price = toNum(p.priceExVat) ?? 0
  const vat = toNum(p.vatRate) // puede ser null
  const stock = typeof p.stock === 'number' ? p.stock : (toNum(p.stock) ?? 0)

  // Bullets unificados (relación o JSON)
  const bullets = getUnifiedBullets(p, (data as any)?.i18n ?? (data as any)?.product?.i18n)

  return (
    <main className="container-max py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <a href={`/${lang}`} className="hover:underline">Inicio</a>
        {' '}<span>›</span>{' '}
        <span>{data.i18nName}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Galería */}
        <div className="rounded-2xl border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <ProductGallery images={p.images ?? []} alt={data.i18nName} />
          
          {p.images && p.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {p.images.slice(1, 6).map((img: any) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={cldUrl(img.cloudinaryPublicId, img.url, { width: 300 })}
                  alt=""
                  className="rounded-md object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{data.i18nName}</h1>

          <div className="text-sm text-gray-600">
            {p.brand && (
              <span className="mr-4">
                Marca: <b>{p.brand}</b>
              </span>
            )}
            {p.ref && (
              <span>
                Ref: <b>{p.ref}</b>
              </span>
            )}
          </div>

          {/* Precio */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-3xl font-bold">
              {price.toFixed(2)} € <span className="text-sm text-gray-500">+ IVA</span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              IVA {vat != null ? `${vat}%` : '—'} · Stock: {stock}
            </div>
            <button
              className="mt-4 w-full rounded-xl bg-brand-primary py-3 font-medium text-white hover:opacity-90"
              type="button"
            >
              Añadir al carrito
            </button>
          </div>

          {/* Variantes del combo (Cliente) */}
          {Array.isArray(data.variantes) && data.variantes.length > 1 && (
            <VariantSelector
              variantes={data.variantes}
              currentId={p.id}
              lang={lang}
              label={data.comboTitle}
            />
          )}

          {/* Descripción */}
          {p.shortDesc && <p className="text-gray-700">{p.shortDesc}</p>}
          {p.longDesc && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: p.longDesc }}
            />
          )}

          {/* Bullets */}
          {bullets.length > 0 ? (
            <ul className="space-y-1 list-disc pl-5">
              {bullets.map((b) => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Relacionados */}
      {data.related?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Relacionados</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {data.related.map((card: any) => {
              const cardPrice = toNum(card.priceExVat) ?? 0

              const CardBody = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cldUrl(card.cloudinaryPublicId, card.imageUrl, { width: 500 })}
                    alt={card.name}
                    className="mb-2 h-36 w-full rounded-lg object-cover"
                    loading="lazy"
                  />


                  <div className="line-clamp-2 text-sm group-hover:underline">
                    {card.name}
                  </div>
                  <div className="mt-1 font-semibold text-brand-primary">
                    {cardPrice.toFixed(2)} €
                  </div>
                </>
              )

              return card.slug ? (
                <a
                  key={card.id}
                  href={`/${lang}/p/${card.slug}`}
                  className="group rounded-xl border bg-white p-3 hover:shadow-soft"
                >
                  {CardBody}
                </a>
              ) : (
                <div
                  key={card.id}
                  className="rounded-xl border bg-white p-3 opacity-95"
                  title="Sin enlace"
                >
                  {CardBody}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </main>
  )
}
