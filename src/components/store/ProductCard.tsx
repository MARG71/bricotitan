import Link from 'next/link'
import { cldUrl } from '@/lib/cloudinaryUrl' // ⬅️ NUEVO

/** === Tipos admitidos (hit de Meili o item del catálogo) === */
type MeiliHit = {
  id?: string | number
  slug?: string
  title?: string
  brand?: string | null
  imageUrl?: string | null
  price?: number | null
  salePrice?: number | null
  inStock?: boolean | null
  rating?: number | null
}

type CatalogItem = {
  id: number | string
  slug?: string
  name?: string
  brand?: string | null
  imageUrl?: string | null
  priceExVat?: number | null
  vatRate?: number | null
  stock?: number | null
}

type Props =
  | { lang: string; hit: MeiliHit; item?: never }
  | { lang: string; item: CatalogItem; hit?: never }
  | { lang: string; hit?: MeiliHit; item?: CatalogItem }

/** Normaliza y NO falla aunque falten campos */
function normalize(hit?: MeiliHit, item?: CatalogItem) {
  const fromHit = hit ?? {}
  const fromItem = item ?? {}

  // Título: preferimos title (Meili) > name (BD) > "Producto"
  const title =
    (typeof fromHit.title === 'string' && fromHit.title.trim()) ||
    (typeof fromItem.name === 'string' && fromItem.name.trim()) ||
    'Producto'

  // Slug: puede venir de hit o de item
  const slug = (fromHit.slug || fromItem.slug)?.toString()

  // Marca
  const brand = fromHit.brand ?? fromItem.brand ?? null

  // Imagen
  const imageUrl = fromHit.imageUrl ?? fromItem.imageUrl ?? null

  // Precio base: Meili (price) o BD (priceExVat)
  let base = Number(fromHit.price ?? (fromItem.priceExVat ?? 0))
  base = Number.isFinite(base) ? base : 0

  // Oferta si hay salePrice válido y menor que base
  const sale = Number(fromHit.salePrice ?? NaN)
  const hasOffer = Number.isFinite(sale) && sale > 0 && sale < base

  const price = hasOffer ? sale : base
  const basePrice = hasOffer ? base : null

  // Stock
  const inStock =
    fromHit.inStock ??
    (typeof fromItem.stock === 'number' ? fromItem.stock > 0 : true)

  // Rating
  const rating =
    typeof fromHit.rating === 'number' ? fromHit.rating : null

  return { slug, title, brand, imageUrl, price, basePrice, hasOffer, inStock, rating }
}

export default function ProductCard({ lang, hit, item }: Props) {
  const { slug, title, brand, imageUrl, price, basePrice, hasOffer, inStock, rating } =
    normalize(hit, item)

  const fmt = (n: number) =>
    Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

  const stars = Math.max(0, Math.min(5, Math.round(rating ?? 0)))
  const resolvedSrc = cldUrl(undefined, imageUrl ?? null, { width: 600 })

  const CardInner = (
    <>
      {/* Imagen */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl ?? '/placeholder.svg'}
          alt={title}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />

        {hasOffer && (
          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white shadow-sm bg-gradient-to-br from-brand-primary to-brand-accent">
            Oferta
          </span>
        )}

        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium shadow
            ${inStock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
        >
          {inStock ? 'En stock' : 'Sin stock'}
        </span>

        {!slug && (
          <span className="absolute left-2 bottom-2 rounded bg-gray-800/80 px-2 py-0.5 text-[10px] text-white">
            Sin enlace
          </span>
        )}
      </div>

      {/* Texto */}
      <div className="mt-2">
        <div className="text-[12px] text-gray-500">{brand ?? '—'}</div>
        <div className="line-clamp-2 text-[14px] font-medium text-gray-900">{title}</div>

        <div className="mt-1 flex items-center gap-2">
          <div className="text-[15px] font-semibold text-gray-900">{fmt(price)}</div>
          {basePrice != null && (
            <div className="text-xs text-gray-400 line-through">{fmt(basePrice)}</div>
          )}
        </div>

        {rating != null && (
          <div className="mt-1 flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                className={i < stars ? 'fill-current' : 'fill-none stroke-current text-amber-300'}
              >
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
                  strokeWidth="1.2"
                />
              </svg>
            ))}
            <span className="ml-1 text-[11px] text-gray-500">{Number(rating ?? 0).toFixed(1)}</span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <li className="group rounded-2xl border p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:shadow-md bg-white">
      {slug ? (
        <Link href={`/${lang}/p/${slug}`} className="block group no-underline focus-visible:outline-none">
          <>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedSrc}
                alt={title}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              {/* ...badges... */}
            </div>
            {/* ...texto... */}
          </>
        </Link>
      ) : (
        <div className="block opacity-95 cursor-default">{/* ... */}</div>
      )}
    </li>
  )
}
