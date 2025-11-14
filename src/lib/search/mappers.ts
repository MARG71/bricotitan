// src/lib/search/mappers.ts
// Mapper compatible con tu UI (incluye alias en ES y EN)
// Mapper compatible con tu UI: name/title, image/thumb, price y stock

const CLOUDINARY_FETCH_BASE = process.env.CLOUDINARY_FETCH_BASE || '';

type AnyImage = {
  url?: string;
  src?: string;
  imageUrl?: string;
  path?: string;
  thumb?: string;
  thumbnail?: string;
  secure_url?: string;
  publicId?: string;
  isMain?: boolean;
  main?: boolean;
  principal?: boolean;
};

function pickImageUrl(p: any): string | null {
  // 1) si hay imágenes relacionadas, prioriza la marcada como principal
  const imgs: AnyImage[] = Array.isArray(p?.images) ? p.images : [];
  const main = imgs.find(i => i.isMain || i.main || i.principal) || imgs[0];

  const raw =
    main?.thumb ??
    main?.thumbnail ??
    main?.url ??
    main?.secure_url ??
    main?.src ??
    main?.imageUrl ??
    main?.path ??
    null;

  // 2) si el producto guarda imagen directa en nivel raíz
  const rawRoot =
    p?.thumb ?? p?.thumbnail ?? p?.image ?? p?.imageUrl ?? p?.url ?? p?.src ?? p?.path ?? null;

  const finalRaw = raw ?? rawRoot;
  if (!finalRaw) return null;

  // 3) Proxy opcional por Cloudinary fetch (si lo tienes configurado)
  if (CLOUDINARY_FETCH_BASE && /^https?:\/\//i.test(finalRaw)) {
    return `${CLOUDINARY_FETCH_BASE}${encodeURIComponent(finalRaw)}`;
  }
  return finalRaw;
}

export type ProductDoc = {
  id: string;
  slug: string;

  // textos
  name: string;
  title: string;            // alias
  titulo: string;           // alias

  shortDesc?: string | null;
  longDesc?: string | null;
  descripcion?: string | null;

  // marca / categoría
  brand?: string | null;
  marca?: string | null;
  categoryName?: string | null;
  categoria?: string | null;

  // precios
  price: number | null;        // PVP (con IVA si hay vatRate)
  priceExVat: number | null;   // base sin IVA
  precio: number | null;       // alias

  // stock
  enStock: boolean;
  stockQty: number | null;     // cantidad
  stock: number | null;        // alias por compatibilidad

  // imagen
  image?: string | null;
  thumb?: string | null;
  imagen?: string | null;

  // ids
  ref?: string | null;
  sku?: string | null;
  ean?: string | null;

  updatedAt: number;
};

export function mapProductoToDoc(p: any): ProductDoc {
  const img = pickImageUrl(p);

  const ex = p.priceExVat != null ? Number(p.priceExVat) : null;
  const vat = p.vatRate != null ? Number(p.vatRate) : null;
  const price = ex != null ? (vat != null ? ex * (1 + vat / 100) : ex) : null;

  const qty = p.stock != null ? Number(p.stock) : null;

  return {
    id: String(p.id),
    slug: p.slug,

    name: p.name ?? '',
    title: p.name ?? '',
    titulo: p.name ?? '',

    shortDesc: p.shortDesc ?? null,
    longDesc: p.longDesc ?? null,
    descripcion: p.longDesc ?? p.shortDesc ?? null,

    brand: p.brand ?? null,
    marca: p.brand ?? null,

    categoryName: p.category?.name ?? null,
    categoria: p.category?.name ?? null,

    price,
    priceExVat: ex,
    precio: price,

    enStock: qty != null ? qty > 0 : true,
    stockQty: qty,
    stock: qty,

    image: img,
    thumb: img,
    imagen: img,

    ref: p.ref ?? null,
    sku: p.ref ?? null,
    ean: p.ean ?? null,

    updatedAt: new Date(p.updatedAt ?? p.createdAt ?? Date.now()).getTime(),
  };
}
