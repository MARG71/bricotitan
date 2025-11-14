import { prisma, readCSV, pick, slugify } from "./lib";

type Cat = Record<string, string>;
type CatImg = Record<string, string>;

function toInt(v?: string | number | null): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s === "0") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const cats = await readCSV<Cat>("var/import/categorias.csv");
  const imgs = await readCSV<CatImg>("var/import/categoriasImg.csv").catch(() => [] as CatImg[]);

  // Mapa de imágenes por id
  const imgMap = new Map<string, string>();
  for (const r of imgs) {
    const id = String(pick(r, "id", "Id", "ID", "ID_CATEGORIA") ?? "");
    const url = String(pick(r, "imageUrl", "imagen", "url", "img", "IMAGEN") ?? "");
    if (id && url) imgMap.set(id, url);
  }

  // Normalizamos filas con campos clave
  const rows = cats.map((r) => {
    const idStr = String(pick(r, "id", "Id", "ID", "ID_CATEGORIA") ?? "").trim();
    const id = Number(idStr);
    const parentRaw = pick(r, "parentId", "parent_id", "PadreID", "idPadre", "CATEGORIA_PADRE");
    const parentId = toInt(parentRaw);
    const name = String(pick(r, "name", "nombre", "title", "Nombre", "NOMBRE_CATEGORIA") ?? "").trim();
    const slugBase = slugify(name);
    // 👇 slug único estable por ID para evitar colisiones
    const slug = slugBase ? `${slugBase}-${id}` : `${id}`;
    return { idStr, id, parentId, name, slug };
  }).filter(r => Number.isFinite(r.id) && r.name);

  // PASADA 1: crear/actualizar SIN parentId (evita FK)
  let n1 = 0;
  for (const r of rows) {
    await prisma.category.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        slug: r.slug,
        parentId: null,
        imageUrl: imgMap.get(String(r.id)) ?? null,
      },
      create: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        parentId: null,
        imageUrl: imgMap.get(String(r.id)) ?? null,
      },
    });
    n1++;
    if (n1 % 1000 === 0) console.log(`... PASO 1: ${n1} categorías upsert`);
  }

  // Cache de ids existentes para validar padres
  const existing = new Set<number>((await prisma.category.findMany({ select: { id: true } })).map(c => c.id));

  // PASADA 2: asignar parentId válido
  let n2 = 0;
  for (const r of rows) {
    let parentId: number | null = r.parentId ?? null;
    if (parentId === r.id) parentId = null;
    if (parentId !== null && !existing.has(parentId)) parentId = null;

    await prisma.category.update({
      where: { id: r.id },
      data: { parentId },
    });
    n2++;
    if (n2 % 1000 === 0) console.log(`... PASO 2: ${n2} parentId asignados`);
  }

  const total = await prisma.category.count();
  console.log(`✔ Categorías importadas/actualizadas: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
