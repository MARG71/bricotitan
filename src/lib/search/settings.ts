// src/lib/search/settings.ts
import { meili, productsIndexName, getOrCreateProductsIndex } from '../meili';
import type { Index } from 'meilisearch';

type AnyDoc = Record<string, any>;

export async function applyProductsIndexSettings() {
  // getOrCreateProductsIndex puede devolver Index | EnqueuedTask,
  // pero aquí SOLO queremos tratarlo como Index
  const index = (await getOrCreateProductsIndex()) as Index<AnyDoc>;

  await index.updateSettings({
    searchableAttributes: [
      'name', 'title', 'titulo', 'shortDesc', 'longDesc', 'descripcion',
      'brand', 'marca', 'categoryName', 'categoria', 'sku', 'ean', 'ref', 'slug',
    ],
    displayedAttributes: [
      'id', 'slug',
      'name', 'title', 'titulo',
      'shortDesc', 'longDesc', 'descripcion',
      'brand', 'marca', 'categoryName', 'categoria',
      'price', 'priceExVat', 'precio',
      'enStock', 'stockQty', 'stock',
      'image', 'thumb', 'imagen',
      'updatedAt',
    ],
    filterableAttributes: ['brand', 'marca', 'categoryName', 'categoria', 'enStock'],
    sortableAttributes: ['price', 'priceExVat', 'updatedAt', 'name', 'titulo', 'stockQty'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    pagination: { maxTotalHits: 1000 },
  });

  return index;
}
