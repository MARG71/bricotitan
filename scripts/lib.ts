import { PrismaClient, Prisma } from "@prisma/client";
import { createReadStream, readFileSync } from "fs";
import { parse } from "csv-parse";

export const prisma = new PrismaClient();

function guessDelimiter(path: string): ";" | "," {
  try {
    const sample = readFileSync(path, { encoding: "utf8" });
    // coge la primera línea no vacía
    const firstLine = sample.split(/\r?\n/).find(l => l.trim().length > 0) ?? "";
    // si la cabecera contiene ';' => usa ';'
    if ((firstLine.match(/;/g) ?? []).length >= 1) return ";";
    return ",";
  } catch {
    return ","; // por defecto
  }
}

export async function readCSV<T = Record<string, string>>(path: string, opts: any = {}): Promise<T[]> {
  const delimiter = guessDelimiter(path);
  return new Promise((resolve, reject) => {
    const rows: T[] = [];
    createReadStream(path)
      .pipe(parse({
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
        delimiter,
        // 👇 tolerancia máxima para CSV “sucios”
        relax_quotes: true,
        relax_column_count: true,
        relax_column_count_less: true,
        relax_column_count_more: true,
        skip_records_with_error: true,   // si una fila está rota, se salta
        skip_lines_with_error: true,     // idem, pero por línea completa
        quote: '"',
        escape: '"',
        ...opts
      }))
      .on("data", (r) => rows.push(r))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}



// admite varios alias por si los CSV vienen con nombres distintos
export function pick(row: Record<string, any>, ...aliases: string[]) {
  for (const k of aliases) {
    const key = Object.keys(row).find(h => h.trim().toLowerCase() === k.toLowerCase());
    if (key) return row[key];
  }
  return undefined;
}

export function toInt(v?: string | number | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function toDec(v?: string | number | null): Prisma.Decimal | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(s);
}

export function slugify(s?: string | null) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
