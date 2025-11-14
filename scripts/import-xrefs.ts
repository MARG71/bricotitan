import { prisma, readCSV, pick, toInt } from "./lib";
type X = Record<string, string>;

async function main() {
  const rows = await readCSV<X>("var/import/xrefs.csv").catch(() => [] as X[]);
  if (!rows.length) { console.log("✔ Xrefs importadas: 0 (archivo vacío o no encontrado)"); return; }

  const existing = new Set<number>((await prisma.product.findMany({ select: { id: true } })).map(p => p.id));

  let n = 0, skipped = 0;
  for (const r of rows) {
    const fromId = toInt(pick(r, "fromId", "desdeId", "idDesde", "id_origen", "ID_DESDE", "ID1", "ID_ORIGEN", "IDART1"));
    const toId   = toInt(pick(r, "toId", "hastaId", "idHasta", "id_destino", "ID_HASTA", "ID2", "ID_DESTINO", "IDART2"));
    const kind   = String(pick(r, "kind", "tipo", "relacion", "TIPO") ?? "RELACIONADO").toUpperCase();

    if (!fromId || !toId || !existing.has(fromId) || !existing.has(toId)) { skipped++; continue; }

    await prisma.productXref.upsert({
      // 👇 usa el nombre del índice compuesto definido en el schema
      where: { xref_triplet_unique: { fromId, toId, kind } },
      update: {},
      create: { fromId, toId, kind },
    });
    n++;
    if (n % 5000 === 0) console.log(`... ${n} xrefs`);
  }

  console.log(`✔ Xrefs importadas: ${n} (saltadas: ${skipped})`);
}
main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
