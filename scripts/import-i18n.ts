import { prisma, readCSV, pick, toInt } from "./lib";

type T = Record<string, string>;
function safeJSON(v?: string) { if (!v) return null; try { return JSON.parse(v); } catch { return null; } }

async function main() {
  const rows = await readCSV<T>("var/import/productos.leng.v2.csv");
  let n = 0, skipped = 0;

  for (const r of rows) {
    const productId = toInt(pick(r, "productId", "productoId", "idProducto", "IDART", "ID_ARTICULO"));
    if (!productId) { skipped++; continue; }
    const lang = String(pick(r, "lang", "LENG", "idioma") ?? "es").toLowerCase();

    const name      = (pick(r, "name", "NOMBRE", "nombre") ?? "") as string | null;
    const shortDesc = (pick(r, "shortDesc", "DESCRIPCION_CORTA", "desc_corta", "descripcion_corta") ?? "") as string | null;
    const longDesc  = (pick(r, "longDesc", "DESCRIPCION_LARGA", "desc_larga", "descripcion_larga") ?? "") as string | null;
    const keywords  = (pick(r, "keywords", "KEYWORDS", "palabras_clave") ?? "") as string | null;

    const bulletsArr: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const bp = pick(r, `BulletPoint${i}`, `bullet${i}`, `bullet_point_${i}`);
      if (bp && String(bp).trim().length) bulletsArr.push(String(bp).trim());
    }
    const bullets = bulletsArr.length ? bulletsArr : safeJSON(String(pick(r, "bullets", "puntos")));

    await prisma.productI18n.upsert({
      // 👇 usa el nombre del índice compuesto definido en el schema
      where: { product_lang_unique: { productId, lang } },
      update: { name, shortDesc, longDesc, keywords, bullets },
      create: { productId, lang, name, shortDesc, longDesc, keywords, bullets },
    });

    n++;
    if (n % 2000 === 0) console.log(`... ${n} i18n`);
  }
  console.log(`✔ Traducciones importadas: ${n} (saltadas por formato: ${skipped})`);
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
