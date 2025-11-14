import { execSync } from "child_process";

const cmds = [
  "tsx scripts/import-categorias.ts",
  "tsx scripts/import-productos.ts",
  "tsx scripts/import-imagenes.ts",
  "tsx scripts/import-i18n.ts",
  "tsx scripts/import-xrefs.ts",
];

for (const c of cmds) {
  console.log(`\n▶ ${c}`);
  execSync(c, { stdio: "inherit" });
}
console.log("\n✔ Importación completa");

async function triggerReindex() {
  const token = process.env.REINDEX_TOKEN!;
  await fetch('http://localhost:3000/api/reindex', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('🔁 Reindex lanzado OK');
}

(async () => {
  // 1) import:cats
  // 2) import:prods
  // 3) import:imgs
  // 4) import:xrefs
  // ...
  await triggerReindex();
})();
