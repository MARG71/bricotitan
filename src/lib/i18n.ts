// src/lib/i18n.ts
// src/lib/i18n.ts
export const SUPPORTED_LOCALES = ['es', 'en', 'de', 'fr', 'pt'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

/** Devuelve el primer componente del locale, en minúsculas (ej: 'es-ES' -> 'es') */
export function normalizeLocale(input?: string | null): string {
  if (!input) return ''
  const lower = String(input).trim().toLowerCase()
  // soporta 'es-ES', 'pt_BR', etc.
  const base = lower.split(/[-_]/)[0] || lower
  return base
}

/** Type guard para comprobar si un string es un Locale soportado */
export function isSupportedLocale(x: string): x is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(x)
}

/** Asegura un Locale soportado, con fallback a DEFAULT_LOCALE */
export function ensureLocale(lang?: string | null): Locale {
  const base = normalizeLocale(lang)
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE
}

/** Intenta extraer el locale desde una URL/path (ej: '/en/p/slug' -> 'en') */
export function coerceLocaleFromPath(pathname: string): Locale {
  // corta query/hash por si llegan
  const pathOnly = pathname.split('?')[0].split('#')[0]
  const seg = pathOnly.split('/').filter(Boolean)[0] // primer segmento
  return ensureLocale(seg)
}

/** Prefija una ruta con el locale correcto (evita duplicarlo) */
export function withLocalePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  const current = coerceLocaleFromPath(clean)
  // si ya empieza por un locale soportado, lo sustituimos
  const parts = clean.split('/').filter(Boolean)
  if (isSupportedLocale(current)) {
    parts[0] = locale
    return `/${parts.join('/')}`
  }
  // si no, lo añadimos al principio
  return `/${locale}${clean}`
}

/** Etiquetas legibles por si quieres enseñar el selector */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
}
