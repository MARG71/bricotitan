import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { getProductsIndex } from '../src/lib/meili';
import { getAllProductsForSearch } from '../src/lib/catalog';

async function main() {
  console.log('MEILI_HOST:', process.env.MEILI_HOST);
  const index = await getProductsIndex();

  const docs = await getAllProductsForSearch('es');

  console.log(`Indexando ${docs.length} productos...`);
  const task = await index.addDocuments(docs, { primaryKey: 'id' });
  console.log('✅ Task encolada:', task);
}

main().catch((e) => { console.error(e); process.exit(1); });
