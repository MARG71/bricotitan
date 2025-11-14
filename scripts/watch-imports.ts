// scripts/watch-imports.ts
// scripts/watch-imports.ts
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const INBOX_DIR = "var/inbox";
const REQUIRED = ["productos.v7.csv", "productos.leng.csv", "imagenes.csv"];

function haveAll(): boolean {
  return REQUIRED.every((f) => fs.existsSync(path.join(INBOX_DIR, f)));
}

let timer: NodeJS.Timeout | null = null;
function scheduleRun() {
  if (timer) clearTimeout(timer);
  // pequeño debounce por si copias varios ficheros seguidos
  timer = setTimeout(() => runImport(), 1500);
}

function runImport() {
  if (!haveAll()) return;
  console.log("Detectado lote completo. Importando…");

  // 👇 Windows-friendly: usamos shell y un comando único
  const cmdStr = "pnpm tsx scripts/provider-import.ts";
  const child = spawn(cmdStr, {
    shell: true,              // <-- clave en Windows
    stdio: "inherit",
    cwd: process.cwd(),       // asegura que se ejecuta en la raíz del proyecto
    windowsHide: true,
  });

  child.on("error", (err) => {
    console.error("Error al lanzar el import:", err);
  });
  child.on("exit", (code) => {
    console.log("Import terminado. Código:", code);
  });
}

function main() {
  if (!fs.existsSync(INBOX_DIR)) fs.mkdirSync(INBOX_DIR, { recursive: true });
  console.log(`Vigilando ${INBOX_DIR} (esperando ${REQUIRED.join(", ")})…`);

  // Si ya están los 3, lanza
  if (haveAll()) scheduleRun();

  fs.watch(INBOX_DIR, { persistent: true }, () => scheduleRun());
}

main();
