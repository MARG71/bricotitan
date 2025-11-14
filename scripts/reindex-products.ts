/* eslint-disable no-console */
// Script CLI que ejecuta el reindex usando la lógica de src/server/reindexProducts.ts
import { runReindex, disconnectPrisma } from '../src/server/reindexProducts';

async function main() {
  console.log('🚀 Iniciando reindex de productos...');
  await runReindex();
}

main()
  .then(async () => {
    console.log('✅ Reindex completado correctamente.');
    await disconnectPrisma();
  })
  .catch(async (e) => {
    console.error('❌ Error en reindex:', e);
    await disconnectPrisma();
    process.exit(1);
  });
