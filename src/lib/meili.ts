// src/lib/meili.ts
import MeiliSearch from 'meilisearch';

try {
  const { config } = require('dotenv');
  config({ path: '.env.local' });
  config();
} catch {}

const host = process.env.MEILI_HOST ?? 'http://127.0.0.1:7700';
const apiKey = process.env.MEILI_MASTER_KEY ?? 'MASTER_KEY_SUPER_SECRETO';
if (!host) throw new Error('MEILI_HOST no está definido. Revisa .env.local.');

export const meili = new MeiliSearch({ host, apiKey });

export const productsIndexName = process.env.MEILI_INDEX_PRODUCTS || 'products';

export function getProductsIndex() {
  return meili.index(productsIndexName);
}

export async function getOrCreateProductsIndex() {
  try {
    return await meili.getIndex(productsIndexName);
  } catch {
    return meili.createIndex(productsIndexName, { primaryKey: 'id' });
  }
}
