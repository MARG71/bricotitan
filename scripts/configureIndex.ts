import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { getProductsIndex } from '../src/lib/meili';

// Carga de variables de entorno
config({ path: '.env.local' });
config();

async function main() {
  const host = process.env.MEILI_HOST;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || 'products';
  if (!host) {
    console.error('❌ No se ha definido MEILI_HOST en .env.local');
    process.exit(1);
  }

  console.log('🔧 Configurando índice Meilisearch...');
  console.log(`➡️  Host: ${host}`);
  console.log(`➡️  Índice: ${indexName}`);

  const index = await getProductsIndex();

  // === Lee sinónimos / stopWords externos si existen ===
  const synonymsPath = path.resolve('data/search/synonyms.json');
  const stopWordsPath = path.resolve('data/search/stopwords.json');

  let synonyms: Record<string, string[]> | undefined;
  let stopWords: string[] | undefined;

  if (fs.existsSync(synonymsPath)) {
    try {
      synonyms = JSON.parse(fs.readFileSync(synonymsPath, 'utf8'));
      console.log(`📘 Sinónimos cargados desde ${synonymsPath}`);
    } catch (err) {
      console.warn('⚠️  Error leyendo synonyms.json, se ignoran.');
    }
  } else {
    synonyms = {
      atornillador: ['destornillador'],
      destornillador: ['atornillador'],
      radial: ['amoladora'],
      amoladora: ['radial'],
    };
  }

  if (fs.existsSync(stopWordsPath)) {
    try {
      stopWords = JSON.parse(fs.readFileSync(stopWordsPath, 'utf8'));
      console.log(`📗 StopWords cargadas desde ${stopWordsPath}`);
    } catch (err) {
      console.warn('⚠️  Error leyendo stopwords.json, se ignoran.');
    }
  } else {
    stopWords = ['de', 'la', 'las', 'los', 'para', 'con', 'y', 'o', 'un', 'una', 'en'];
  }

  // === Aplicar configuración al índice ===
  await index.updateSettings({
    searchableAttributes: [
      'title',
      'description',
      'brand',
      'category',
      'subcategory',
      'tags',
      'attributes',
    ],
    displayedAttributes: [
      'id',
      'slug',
      'title',
      'description',
      'brand',
      'category',
      'subcategory',
      'price',
      'priceExVat',
      'salePrice',
      'inStock',
      'rating',
      'tags',
      'imageUrl',
      'createdAt',
      'updatedAt',
    ],
    filterableAttributes: [
      'category',
      'subcategory',
      'brand',
      'inStock',
      'price',
      'priceExVat',
      'rating',
      'tags',
    ],
    sortableAttributes: ['price', 'priceExVat', 'rating', 'createdAt', 'updatedAt'],
    faceting: { maxValuesPerFacet: 200 },
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    synonyms,
    stopWords,
  });

  console.log('✅ Configuración aplicada correctamente.');
  console.log('----------------------------------------');
  console.log(`📦 Índice: ${indexName}`);
  console.log(`🔍 Host:   ${host}`);
  console.log('----------------------------------------');
}

main().catch((e) => {
  console.error('❌ Error configurando el índice:', e);
  process.exit(1);
});
