// scripts/provider-import.ts
// scripts/provider-import.ts (parche columnas + DEBUG)
import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma, readCSV, pick, toInt } from "./lib";

const INBOX_DIR = "var/inbox";
const ARCHIVE_DIR = "var/archive";
const TMP_DIR = "var/tmp";
const UNIQUE_WHERE_KEY = "productId_url_unique";

type Row = Record<string, string>;
type ImgRow = { productId: number; url: string; sort: number };

const DEBUG = process.env.DEBUG_IMPORT === "1";

function ensureDirs() {
  [INBOX_DIR, ARCHIVE_DIR, TMP_DIR].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}
function requireFiles() {
  const need = ["productos.v7.csv", "productos.leng.csv", "imagenes.csv"];
  const missing = need.filter((f) => !fs.existsSync(path.join(INBOX_DIR, f)));
  if (missing.length) throw new Error(`Faltan ficheros en ${INBOX_DIR}: ${missing.join(", ")}`);
  return {
    productosV7: path.join(INBOX_DIR, "productos.v7.csv"),
    productosLeng: path.join(INBOX_DIR, "productos.leng.csv"),
    imagenes: path.join(INBOX_DIR, "imagenes.csv"),
  };
}
function nowStamp() {
  const d = new Date();
  const p = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/* ========= Helpers ========= */
function toDecimalOrNull(v: any): Prisma.Decimal | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[€\s]/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n.toFixed(2));
}
function listKeys(rows: Row[]) {
  const keys = new Set<string>();
  rows.slice(0, 2).forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  return Array.from(keys);
}

/* ========= Extractores con más alias (incluye espacios) ========= */
function extractProductId(row: Row): number | null {
  const pid = toInt(pick(
    row,
    "id","ID","productId","productoId","idProducto",
    "ID_PRODUCTO","ID PRODUCTO","id_articulo","ID_ARTICULO","ID ARTICULO","idArticulo"
  ));
  return pid && Number.isFinite(pid) ? pid : null;
}
function extractRef(row: Row): string | null {
  const r = String(pick(row,"ref","REF","referencia","sku","SKU","CODIGO","CODIGO ARTICULO","CODIGO_ARTICULO") ?? "").trim();
  return r || null;
}
function extractBaseName(row: Row): string | null {
  const n = String(pick(row,"name","NAME","nombre","NOMBRE","titulo","TITULO","DESCRIPCION","descripcion corta") ?? "").trim();
  return n || null;
}
function extractLang(row: Row): string | null {
  const l = String(pick(row,"lang","LANG","idioma","IDIOMA") ?? "").trim().toLowerCase();
  return l || null; // si viene vacío, luego forzamos 'es'
}
function extractI18nName(row: Row): string | null {
  const n = String(pick(row,"name","NAME","titulo","TITULO","NOMBRE","DESCRIPCION") ?? "").trim();
  return n || null;
}
function extractI18nShortDesc(row: Row): string | null {
  const v = String(pick(row,"shortDesc","short","descripcionCorta","DESCRIPCION_CORTA","DESCRIPCION CORTA") ?? "").trim();
  return v || null;
}
function extractI18nLongDesc(row: Row): string | null {
  const v = String(pick(row,"longDesc","descripcion","DESCRIPCION","DESCRIPCION LARGA","descripcion_larga") ?? "").trim();
  return v || null;
}
function extractI18nKeywords(row: Row): string | null {
  const v = String(pick(row,"keywords","palabrasClave","KEYWORDS","PALABRAS CLAVE") ?? "").trim();
  return v || null;
}
function extractI18nBullets(row: Row): any {
  const raw = pick(row,"bullets","BULLETS","puntos","PUNTOS");
  if (!raw) return null;
  try { return JSON.parse(String(raw)); } catch { return String(raw); }
}
function extractUrl(row: Row): string | null {
  const url = String(pick(
    row,
    "url","URL","imageUrl","imagen","IMAGEN","URL_IMAGEN","URL IMAGEN","link","LINK"
  ) ?? "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}
function extractSort(row: Row): number {
  const s = toInt(pick(row,"sort","orden","pos","posicion","ORDEN","POSITION","POSICION"));
  return Number.isFinite(s || NaN) ? (s as number) : Number.MAX_SAFE_INTEGER;
}
function splitImagesField(v?: string): string[] {
  if (!v) return [];
  return String(v)
    .split(/[|;,]\s*/g)
    .map(s=>s.trim())
    .filter(u=>/^https?:\/\//i.test(u));
}
function extractPriceExVat(row: Row): Prisma.Decimal | null {
  const raw = pick(
    row,
    "priceExVat","price","precio","precioSinIVA","precio_sin_iva",
    "PVP_SIN_IVA","BASE_PRICE","PRECIO SIN IVA","PRECIO_SIN_IVA"
  );
  return toDecimalOrNull(raw);
}

/* ========= Parsers ========= */
async function parseProductosV7(file: string) {
  const rows = await readCSV<Row>(file).catch(()=>[] as Row[]);
  if (DEBUG) {
    console.log("[DEBUG V7] cabeceras:", listKeys(rows));
    console.log("[DEBUG V7] sample:", rows.slice(0,2));
  }
  const productIds = new Set<number>();
  const baseMap = new Map<number,{ref:string; name:string; priceExVat: Prisma.Decimal | null}>();
  for (const r of rows) {
    const id = extractProductId(r);
    const ref = extractRef(r);
    if (!id || !ref) continue;
    const baseName = extractBaseName(r) ?? "";
    const price = extractPriceExVat(r);
    productIds.add(id);
    baseMap.set(id, { ref, name: baseName, priceExVat: price });
  }
  return { productIds, baseMap };
}
async function parseProductosLeng(file: string, allowedIds: Set<number>) {
  const rows = await readCSV<Row>(file).catch(()=>[] as Row[]);
  if (DEBUG) {
    console.log("[DEBUG LENG] cabeceras:", listKeys(rows));
    console.log("[DEBUG LENG] sample:", rows.slice(0,2));
  }
  const i18n: Array<{ productId:number; lang:string; name:string|null; shortDesc:string|null; longDesc:string|null; keywords:string|null; bullets:any }> = [];
  const nameFallback = new Map<number,string>();
  for (const r of rows) {
    const id = extractProductId(r);
    if (!id || !allowedIds.has(id)) continue;
    let lang = extractLang(r) || "es"; // 👈 si no hay lang, asumimos 'es'
    const name = extractI18nName(r);
    const shortDesc = extractI18nShortDesc(r);
    const longDesc = extractI18nLongDesc(r);
    const keywords = extractI18nKeywords(r);
    const bullets = extractI18nBullets(r);
    i18n.push({ productId:id, lang, name, shortDesc, longDesc, keywords, bullets });
    if (name && (!nameFallback.has(id) || lang === "es")) nameFallback.set(id, name);
  }
  return { i18n, nameFallback };
}
async function parseImagenes(file: string, allowedIds: Set<number>) {
  const rows = await readCSV<Row>(file).catch(()=>[] as Row[]);
  if (DEBUG) {
    console.log("[DEBUG IMG] cabeceras:", listKeys(rows));
    console.log("[DEBUG IMG] sample:", rows.slice(0,2));
  }
  const imgs: ImgRow[] = [];
  for (const r of rows) {
    const pid = extractProductId(r);
    if (!pid || !allowedIds.has(pid)) continue;
    const single = extractUrl(r);
    if (single) {
      imgs.push({ productId: pid, url: single, sort: extractSort(r) });
      continue;
    }
    const all = splitImagesField(
      (pick(r,"TodasImagenes","TODASIMAGENES","IMAGENES","IMGS","Imagenes","todas_imagenes","IMAGENES TODAS") as string | undefined) || ""
    );
    all.forEach((u, idx)=> imgs.push({ productId: pid, url: u, sort: idx }));
  }
  return imgs;
}
function groupAndNormalizeImages(imgs: ImgRow[]) {
  const byProd = new Map<number, Map<string, number>>();
  for (const it of imgs) {
    const map = byProd.get(it.productId) ?? new Map<string, number>();
    const prev = map.get(it.url);
    const s = Number.isFinite(it.sort) ? it.sort : Number.MAX_SAFE_INTEGER;
    map.set(it.url, prev==null ? s : Math.min(prev, s));
    byProd.set(it.productId, map);
  }
  const normalized = new Map<number, Array<{ url:string; sort:number }>>();
  for (const [pid, urlMap] of byProd) {
    const arr = Array.from(urlMap.entries()).map(([url, sort])=>({url, sort})).sort((a,b)=>a.sort-b.sort);
    normalized.set(pid, arr.map((x,idx)=>({ url:x.url, sort:idx })));
  }
  return normalized;
}

/* ========= Main ========= */
async function main() {
  ensureDirs();
  const lockFile = path.join(TMP_DIR,"provider-import.lock");
  if (fs.existsSync(lockFile)) { console.log("Otro import en curso. Salgo."); return; }
  fs.writeFileSync(lockFile, String(Date.now()));

  try {
    const FULL_REPLACE = process.env.FULL_REPLACE === "1";
    const { productosV7, productosLeng, imagenes } = requireFiles();
    console.log("• Encontrados:", { productosV7, productosLeng, imagenes });

    const { productIds, baseMap } = await parseProductosV7(productosV7);
    if (productIds.size === 0) { console.log("productos.v7.csv sin filas válidas."); return; }

    const { i18n, nameFallback } = await parseProductosLeng(productosLeng, productIds);
    const rawImgs = await parseImagenes(imagenes, productIds);
    const imgsByProduct = groupAndNormalizeImages(rawImgs);

    const productActions = Array.from(productIds).map((id) => {
      const base = baseMap.get(id);
      const ref = base?.ref ?? null;
      let name: string | null = (base?.name && base?.name.trim().length) ? base.name : null;
      if (!name) { const nf = nameFallback.get(id); if (nf && nf.trim().length) name = nf; }
      const priceExVat = base?.priceExVat ?? new Prisma.Decimal(0);
      const updateData: any = {};
      if (ref) updateData.ref = ref;
      if (name) updateData.name = name;
      if (base?.priceExVat) updateData.priceExVat = priceExVat;
      return prisma.product.upsert({
        where: { id },
        update: updateData,
        create: { id, ref: ref ?? "SIN-REF-" + id, name: name ?? "Producto " + id, priceExVat },
      });
    });
    await prisma.$transaction(productActions, { timeout: 120_000 });

    if (i18n.length) {
      const i18nActions = i18n.map((r) =>
        prisma.productI18n.upsert({
          where: { product_lang_unique: { productId: r.productId, lang: r.lang } },
          update: {
            name: r.name ?? undefined,
            shortDesc: r.shortDesc ?? undefined,
            longDesc: r.longDesc ?? undefined,
            keywords: r.keywords ?? undefined,
            bullets: r.bullets ?? undefined,
          },
          create: {
            productId: r.productId, lang: r.lang,
            name: r.name ?? null, shortDesc: r.shortDesc ?? null, longDesc: r.longDesc ?? null,
            keywords: r.keywords ?? null, bullets: r.bullets ?? null,
          },
        })
      );
      await prisma.$transaction(i18nActions, { timeout: 120_000 });
    }

    let upserts = 0, replaces = 0;
    for (const [productId, imgs] of imgsByProduct) {
      if (FULL_REPLACE) { await prisma.productImage.deleteMany({ where: { productId } }); replaces++; }
      const actions = imgs.map(({ url, sort }) =>
        prisma.productImage.upsert({
          where: { [UNIQUE_WHERE_KEY]: { productId, url } } as any,
          update: { sort },
          create: { productId, url, sort },
        })
      );
      await prisma.$transaction(actions, { timeout: 120_000 });
      upserts += actions.length;
    }

    console.log(`✔ Products upsert: ${productIds.size}`);
    console.log(`✔ I18n upsert: ${i18n.length}`);
    console.log(`✔ Images upsert: ${upserts}${FULL_REPLACE ? ` | Productos con replace: ${replaces}` : ""}`);

    const stamp = nowStamp();
    const batchDir = path.join(ARCHIVE_DIR, stamp);
    fs.mkdirSync(batchDir, { recursive: true });
    fs.renameSync(productosV7, path.join(batchDir, "productos.v7.csv"));
    fs.renameSync(productosLeng, path.join(batchDir, "productos.leng.csv"));
    fs.renameSync(imagenes, path.join(batchDir, "imagenes.csv"));
    console.log(`→ Archivado en ${batchDir}`);
  } catch (err) {
    console.error("ERROR import:", err);
  } finally {
    const lockFile = path.join(TMP_DIR,"provider-import.lock");
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  }
}

main()
  .then(()=>prisma.$disconnect())
  .catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
