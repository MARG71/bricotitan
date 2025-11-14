import { getProductsIndex } from '@/lib/meili';
import { prisma } from '@/lib/db';
import { ensureLocale } from '@/lib/i18n';

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' ? v : Number(v);
}

export async function upsertProductInSearch(productId: number, langInput: string = 'es') {
  const lang = ensureLocale(langInput);
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sort: 'asc' }, take: 1 },
      i18n: { where: { lang: { in: [lang, 'es'] } } },
      category: { select: { slug: true, parent: { select: { slug: true } } } },
    },
  });
  if (!p) return;

  const parentSlug = p.category?.parent?.slug ?? null;
  const catSlug = p.category?.slug ?? 'general';
  const category = parentSlug ?? catSlug;
  const subcategory = parentSlug ? catSlug : null;

  const priceExVat = toNum(p.priceExVat) ?? 0;
  const vatRate = toNum(p.vatRate);
  const price = vatRate == null ? priceExVat : Math.round(priceExVat * (1 + vatRate / 100) * 100) / 100;

  const doc = {
    id: String(p.id),
    slug: p.slug,
    title: (p.i18n?.find(t => t.lang === lang)?.name) ?? (p.i18n?.find(t => t.lang === 'es')?.name) ?? p.name ?? 'Producto',
    brand: p.brand ?? null,
    category,
    subcategory,
    price,
    priceExVat,
    inStock: (p.stock ?? 0) > 0,
    imageUrl: (p.images?.[0]?.url as string | null) ?? null,
    createdAt: p.createdAt?.toISOString?.(),
    updatedAt: p.updatedAt?.toISOString?.(),
  };

  const index = await getProductsIndex();
  await index.addDocuments([doc], { primaryKey: 'id' });
}

export async function deleteProductFromSearch(productId: number) {
  const index = await getProductsIndex();
  await index.deleteDocuments([String(productId)]);
}
