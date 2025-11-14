import { prisma, readCSV, pick, toDec, toInt } from "./lib";
import { Prisma } from "@prisma/client";

type Prod = Record<string, string>;

function firstIntFromCategs(v?: string): number | null {
  if (!v) return null;
  const m = String(v).match(/\d+/);
  return m ? Number(m[0]) : null;
}

async function main() {
  // 1) Cargamos categorías existentes a memoria para validar FK
  const existingCats = new Set<number>(
    (await prisma.category.findMany({ select: { id: true } })).map(c => c.id)
  );

  // 2) Leemos CSV de productos (detecta ; o , y tolera comillas)
  const rows = await readCSV<Prod>("var/import/productos.v8.csv");
  let n = 0;

  for (const r of rows) {
    const idStr = String(pick(r, "id", "ID") ?? "").trim();
    if (!idStr) continue;
    const id = Number(idStr);

    const ref = String(pick(r, "ref", "REF", "referencia", "sku") ?? "").trim();
    const ean = (pick(r, "ean", "EAN", "barcode", "codigo_barras") as string | undefined) || null;
    const name = String(pick(r, "name", "NOMBRE", "nombre", "titulo") ?? "").trim();

    const shortDesc = (pick(r, "shortDesc", "DESCRIPCION_CORTA", "descripcion_corta", "desc_corta") as string | undefined) || null;
    const longDesc  = (pick(r, "longDesc", "DESCRIPCION_LARGA", "descripcion_larga", "desc_larga", "descripcion") as string | undefined) || null;
    const brand     = (pick(r, "brand", "MARCA", "marca") as string | undefined) || null;

    const priceExVat = toDec(pick(r, "priceExVat", "PVP_SINIVA", "precio_sin_iva", "pvp_sin_iva", "precio")) ?? new Prisma.Decimal(0);
    const vatType = (pick(r, "vatType", "TIPO_IVA", "tipo_iva") as string | undefined) || null;
    const vatRate = toDec(pick(r, "vatRate", "POR_IVA", "iva", "porcentaje_iva"));

    const stock  = toInt(pick(r, "stock", "STOCK", "existencias", "disponible"));
    const weight = toDec(pick(r, "weight", "PESO_GR", "peso", "peso_gr"));
    const height = toDec(pick(r, "height", "ALTO_CM", "alto", "alto_cm"));
    const width  = toDec(pick(r, "width", "ANCHO_CM", "ancho", "ancho_cm"));
    const length = toDec(pick(r, "length", "LARGO_CM", "largo", "largo_cm"));

    // categoryId desde varias columnas; si no existe en BD, ponemos null
    let categoryId =
      toInt(pick(r, "categoryId", "categoriaId", "idCategoria", "categoria_id")) ??
      firstIntFromCategs(pick(r, "CATEGS", "categs"));

    if (categoryId !== null && !existingCats.has(categoryId)) {
      categoryId = null; // evita FK P2003
    }

    await prisma.product.upsert({
      where: { id },
      update: {
        ref, ean, name, shortDesc, longDesc, brand,
        priceExVat, vatType, vatRate,
        stock, weight, width, height, length,
        categoryId,
      },
      create: {
        id,
        ref, ean, name, shortDesc, longDesc, brand,
        priceExVat, vatType, vatRate,
        stock, weight, width, height, length,
        categoryId,
      },
    });

    n++;
    if (n % 1000 === 0) console.log(`... ${n} productos`);
  }

  const total = await prisma.product.count();
  console.log(`✔ Productos importados/actualizados: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
