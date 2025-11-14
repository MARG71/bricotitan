import { getProductsIndex } from '@/lib/meili';
import { getAllProductsForSearch } from '@/lib/catalog';

export async function reindexAllProducts(lang: 'es'|'en' = 'es') {
  const index = await getProductsIndex();
  const docs = await getAllProductsForSearch(lang);
  const task = await index.addDocuments(docs, { primaryKey: 'id' });
  return task;
}
