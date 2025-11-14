// src/lib/cloudinaryUrl.ts

// src/lib/cloudinaryUrl.ts
// ========================================================
// Genera URLs Cloudinary de forma segura y optimizada
// Compatible con imágenes subidas (public_id) y URLs externas
// ========================================================

const CLOUD =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME;

if (!CLOUD) {
  console.warn('[cloudinaryUrl] Falta NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME o CLOUDINARY_CLOUD_NAME');
}

type BuildOpts = {
  width?: number;                 // w_
  quality?: 'auto' | number;      // q_
  format?: 'auto' | 'avif' | 'webp' | 'jpg' | 'png'; // f_
  dpr?: 'auto' | number;          // dpr_
};

/** Construye la cadena de transformaciones */
function buildTransform({
  width,
  quality = 'auto',
  format = 'auto',
  dpr = 'auto',
}: BuildOpts = {}) {
  const parts: string[] = [];
  if (format) parts.push(`f_${format}`);
  if (quality) parts.push(`q_${quality}`);
  if (dpr) parts.push(`dpr_${dpr}`);
  if (width) parts.push(`w_${Math.max(1, Math.floor(width))}`);
  return parts.length ? parts.join(',') : 'f_auto,q_auto';
}

/** Detecta si una cadena parece URL HTTP */
function isHttp(u?: string | null): boolean {
  return !!u && /^https?:\/\//i.test(u);
}

/** Desde un public_id subido */
export function cldFromPublicId(publicId: string, opts?: BuildOpts): string {
  const t = buildTransform(opts);
  // Nota: NO usamos encodeURIComponent porque los public_id válidos ya tienen '/'
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}

/** Desde una URL externa (Fetch mode) */
export function cldFromExternal(url: string, opts?: BuildOpts): string {
  const t = buildTransform(opts);
  // Aquí sí conviene encodeURIComponent para evitar problemas con '?', '#', etc.
  const encoded = encodeURIComponent(url);
  return `https://res.cloudinary.com/${CLOUD}/image/fetch/${t}/${encoded}`;
}

/**
 * cldUrl(publicId?, fallbackUrl?, opts?)
 * - Si hay public_id → usa /upload/
 * - Si no → usa /fetch/ con la URL original
 * - Si no hay ninguna → placeholder local
 */
export function cldUrl(
  publicId?: string | null,
  fallbackUrl?: string | null,
  opts?: BuildOpts
): string {
  if (!CLOUD) return fallbackUrl || '/placeholder.svg';

  if (publicId && !isHttp(publicId)) {
    return cldFromPublicId(publicId, opts);
  }

  if (fallbackUrl && isHttp(fallbackUrl)) {
    return cldFromExternal(fallbackUrl, opts);
  }

  return '/placeholder.svg';
}
