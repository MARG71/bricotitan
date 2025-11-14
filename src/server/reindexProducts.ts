/* eslint-disable no-console */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { meili, productsIndexName, getOrCreateProductsIndex } from '../lib/meili';
import { mapProductoToDoc } from '../lib/search/mappers';
import { applyProductsIndexSettings } from '../lib/search/settings';

const prisma = new PrismaClient();
const BATCH = 1000;

function getProductModel() {
  const p = prisma as any;
  return p.product ?? p.products ?? p.producto ?? p.articulo ?? p.items ?? null;
}

async function* productStream(batchSize: number) {
  const Product = getProductModel();
  if (!Product) throw new Error('Modelo de productos no encontrado en Prisma.');

  let skip = 0;
  while (true) {
    const items = await Product.findMany({
      skip,
      take: batchSize,
      include: {
        category: true,
        images: true, // si no quieres imágenes, quítalo y el mapper pondrá null
      },
      orderBy: { updatedAt: 'desc' }, // usa createdAt o id si prefieres
    });
    if (!items.length) break;
    yield items;
    skip += items.length;
  }
}

export async function runReindex() {
  console.time('reindex');
  const index = await getOrCreateProductsIndex();

  console.log('🧹 Limpiando documentos…');
  try {
    await index.deleteAllDocuments();
  } catch {}

  await applyProductsIndexSettings();

  let sent = 0;
  for await (const batch of productStream(BATCH)) {
    const docs = batch.map(mapProductoToDoc);
    await meili.index(productsIndexName).addDocuments(docs); // Meili indexa en background
    sent += docs.length;
    console.log(`   → Encolados ${sent}`);
  }
  console.timeEnd('reindex');
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
