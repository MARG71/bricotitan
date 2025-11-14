// src/lib/slug.ts
// Utilidad de slugs con unicidad fuerte usando ref o id.

function basicSlugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD')                 // separa acentos
    .replace(/[\u0300-\u036f]/g, '')   // quita marcas diacríticas
    .replace(/[^a-zA-Z0-9]+/g, '-')    // no alfanum => guion
    .replace(/^-+|-+$/g, '')           // recorta guiones extremos
    .replace(/-{2,}/g, '-')            // colapsa múltiples guiones
    .toLowerCase();
}

/**
 * Genera un slug único en sí mismo, sin consultar BD:
 * - base: título/nombre
 * - sufijo: ref (si existe y es único en BD) o id (siempre único)
 *
 * Ejemplos:
 *  - ("Varilla Roscada 1m", "06280545", 2143) -> "varilla-roscada-1m-06280545"
 *  - ("Varilla Roscada 1m", null, 2143)       -> "varilla-roscada-1m-2143"
 */
export function makeUniqueSlug(base: string, opts: { ref?: string | null; id: number }): string {
  const core = basicSlugify(base || '');
  const suffix = opts.ref ? basicSlugify(String(opts.ref)) : String(opts.id);
  return core ? `${core}-${suffix}` : suffix;
}
