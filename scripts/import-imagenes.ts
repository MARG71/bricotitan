import { prisma, readCSV, pick, toInt } from "./lib";

type Row = Record<string, string>;

/** Normaliza diferentes columnas de imagen y producto en ambos formatos */
function extractProductId(row: Row): number | null {
  const pid =
    toInt(pick(row,
      "productId", "productoId", "idProducto", "idArticulo",
      "ID_ARTICULO", "ID_PRODUCTO", "ID"
    ));
  return pid && Number.isFinite(pid) ? pid : null;
}

function extractUrl(row: Row): string | null {
  const url = String(
    pick(row, "url", "URL", "imageUrl", "imagen", "IMAGEN", "URL_IMAGEN", "link", "enlace") ?? ""
  ).trim();
  return url.length ? url : null;
}

function extractSort(row: Row): number {
  const s = toInt(pick(row, "sort", "orden", "pos", "posicion", "ORDEN", "POSITION"));
  return Number.isFinite(s || NaN) ? (s as number) : 0;
}

/** Separa un campo con múltiples URLs en un array */
function splitImagesField(v?: string): string[] {
  if (!v) return [];
  return String(v)
    .split(/[|;,]\s*/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Lee imagenes.v2.csv (formato flexible, 1 fila = 1 imagen) */
async function readImagenesV2(): Promise<Array<{ productId: number; url: string; sort: number }>> {
  const rows = await readCSV<Row>("var/import/imagenes.v2.csv").catch(() => [] as Row[]);
  const out: Array<{ productId: number; url: string; sort: number }> = [];
  for (const r of rows) {
    const productId = extractProductId(r);
    const url = extractUrl(r);
    const sort = extractSort(r);
    if (productId && url) out.push({ productId, url, sort });
  }
  return out;
}

/** Lee imagenes.csv (mismo esquema *o* columna con todas las imágenes en una celda) */
async function readImagenesLegacy(): Promise<Array<{ productId: number; url: string; sort: number }>> {
  const rows = await readCSV<Row>("var/import/imagenes.csv").catch(() => [] as Row[]);
  const out: Array<{ productId: number; url: string; sort: number }> = [];

  for (const r of rows) {
    const productId = extractProductId(r);
    if (!productId) continue;

    // Intento 1: esquema 1 fila = 1 imagen (url/sort presentes)
    const singleUrl = extractUrl(r);
    if (singleUrl) {
      out.push({ productId, url: singleUrl, sort: extractSort(r) });
      continue;
    }

    // Intento 2: columna "TodasImagenes" (o similares) con varias URLs separadas
    const allImgs =
      (pick(r, "TodasImagenes", "TODASIMAGENES", "IMAGENES", "IMGS", "Imagenes", "todas_imagenes") as string | undefined) || "";
    const urls = splitImagesField(allImgs).filter(u => /^https?:\/\//i.test(u));
    urls.forEach((u, idx) => out.push({ productId, url: u, sort: idx }));
  }

  return out;
}

/** Lee productos.v8.csv como último recurso (columna TodasImagenes) */
async function readFromProductsFallback(): Promise<Array<{ productId: number; url: string; sort: number }>> {
  const rows = await readCSV<Row>("var/import/productos.v8.csv").catch(() => [] as Row[]);
  const out: Array<{ productId: number; url: string; sort: number }> = [];
  if (!rows.length) return out;

  // Validamos que el producto exista (para no romper FK)
  const existingProds = new Set<number>(
    (await prisma.product.findMany({ select: { id: true } })).map(p => p.id)
  );

  for (const r of rows) {
    const pidRaw = String(pick(r, "id", "ID") ?? "").trim();
    const productId = pidRaw ? Number(pidRaw) : NaN;
    if (!Number.isFinite(productId) || !existingProds.has(productId)) continue;

    const allImgs =
      (pick(r, "TodasImagenes", "TODASIMAGENES", "IMAGENES", "IMGS", "Imagenes", "todas_imagenes") as string | undefined) || "";
    const urls = splitImagesField(allImgs).filter(u => /^https?:\/\//i.test(u));
    urls.forEach((u, idx) => out.push({ productId, url: u, sort: idx }));
  }

  return out;
}

/**
 * Combina las fuentes:
 * - Prioridad por defecto: imagenes.v2.csv > imagenes.csv > productos.v8.csv
 * - Si una misma (productId, url) aparece varias veces, se queda la de mayor prioridad.
 * - No borra nada: hace UPSERT (actualiza sort si ya existe y crea si no).
 */
async function main() {
  // Toggle (opcional): si quieres reemplazo total por producto, exporta FULL_REPLACE=1
  const FULL_REPLACE = process.env.FULL_REPLACE === "1";

  const [v2, legacy, fallback] = await Promise.all([
    readImagenesV2(),
    readImagenesLegacy(),
    readFromProductsFallback()
  ]);

  // Mapa: productId -> Map<url, {sort, sourcePriority}>
  type ImgRec = { sort: number; source: number };
  const byProd = new Map<number, Map<string, ImgRec>>();

  const push = (list: Array<{ productId: number; url: string; sort: number }>, source: number) => {
    for (const it of list) {
      const map = byProd.get(it.productId) ?? new Map<string, ImgRec>();
      const prev = map.get(it.url);
      if (!prev || source < prev.source) {
        // Menor "source" = mayor prioridad
        map.set(it.url, { sort: it.sort ?? 0, source });
      }
      byProd.set(it.productId, map);
    }
  };

  // Prioridad: v2 (0) > legacy (1) > fallback (2)
  push(v2, 0);
  push(legacy, 1);
  push(fallback, 2);

  // Validación de productos existentes (para no romper FK)
  const existingProds = new Set<number>(
    (await prisma.product.findMany({ select: { id: true } })).map(p => p.id)
  );

  let upserts = 0;
  let deletes = 0;

  for (const [productId, urlMap] of byProd) {
    if (!existingProds.has(productId)) continue;

    if (FULL_REPLACE) {
      // Borrado previo SOLO si se activa la bandera
      await prisma.productImage.deleteMany({ where: { productId } });
      deletes++;
    }

    // Prisma no tiene createOrUpdateMany, así que hacemos upserts 1 a 1 (rápidos con índice único)
    const actions = Array.from(urlMap.entries()).map(([url, rec]) =>
      prisma.productImage.upsert({
        where: { productId_url: { productId, url } }, // requiere @@unique([productId, url])
        update: { sort: rec.sort },
        create: { productId, url, sort: rec.sort }
      })
    );

    await prisma.$transaction(actions, { timeout: 60000 });
    upserts += actions.length;
  }

  console.log(`✔ Imágenes procesadas (UPSERTS): ${upserts}${FULL_REPLACE ? ` | Productos con replace: ${deletes}` : ""}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
