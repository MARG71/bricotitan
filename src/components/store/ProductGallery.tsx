'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { cldUrl } from '@/lib/cloudinaryUrl';

type Img = {
  id?: number | string;
  url?: string | null;
  cloudinaryPublicId?: string | null;
  sort?: number | null;
};

type Props = {
  images: Img[];
  alt?: string;
};

export default function ProductGallery({ images, alt = '' }: Props) {
  const sorted = useMemo(
    () =>
      [...(images ?? [])].sort((a, b) => {
        const sa = Number.isFinite(a.sort as any) ? Number(a.sort) : 0;
        const sb = Number.isFinite(b.sort as any) ? Number(b.sort) : 0;
        if (sa !== sb) return sa - sb;
        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      }),
    [images]
  );

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const hasImages = sorted.length > 0;
  const current = hasImages ? sorted[Math.min(index, sorted.length - 1)] : undefined;

  const mainSrc = useMemo(() => {
    if (!current) return '/placeholder.svg';
    return cldUrl(current.cloudinaryPublicId ?? undefined, current.url ?? null, {
      width: 1600,
      quality: 'auto',
      format: 'auto',
      dpr: 'auto',
    });
  }, [current]);

  // Pre-carga cuando cambia la imagen para que el skeleton se vea suave
  useEffect(() => {
    if (!mainSrc) return;
    setLoaded(false);
    const img = new Image();
    img.src = mainSrc;
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // evita quedarse en skeleton si falla
  }, [mainSrc]);

  // Accesibilidad: cerrar modal con Esc
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setZoomOpen(false);
  }, []);
  useEffect(() => {
    if (!zoomOpen) return;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen, onKeyDown]);

  return (
    <div className="w-full">
      {/* Contenedor principal */}
      <div className="relative overflow-hidden rounded-xl border bg-gray-50">
        {/* Skeleton shimmer */}
        {!loaded && (
          <div className="aspect-square w-full animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* Imagen principal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainSrc}
          alt={alt}
          className={`aspect-square h-auto w-full object-contain transition-transform duration-300
            ${loaded ? 'opacity-100' : 'opacity-0'}
            hover:scale-[1.02]`}
          loading="eager"
          sizes="(min-width: 1024px) 600px, (min-width: 768px) 50vw, 100vw"
          onClick={() => hasImages && setZoomOpen(true)}
          style={{ cursor: hasImages ? 'zoom-in' : 'default' }}
        />

        {/* Badge de contador */}
        {hasImages && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            {index + 1}/{sorted.length}
          </span>
        )}
      </div>

      {/* Miniaturas */}
      {sorted.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {sorted.slice(0, 10).map((img, i) => {
            const thumbSrc = cldUrl(img.cloudinaryPublicId ?? undefined, img.url ?? null, {
              width: 300,
              quality: 'auto',
              format: 'auto',
              dpr: 'auto',
            });
            const active = i === index;
            return (
              <button
                key={img.id ?? i}
                type="button"
                onClick={() => setIndex(i)}
                className={`group relative overflow-hidden rounded-md border ${
                  active ? 'ring-2 ring-brand-primary' : 'hover:border-gray-300'
                }`}
                aria-label={`Imagen ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de zoom */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute right-2 top-2 z-[70] rounded-full bg-black/70 px-2 py-1 text-xs text-white hover:bg-black/80"
              aria-label="Cerrar"
              style={{ cursor: 'pointer' }}
            >
              Cerrar ✕
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainSrc}
              alt={alt}
              className="max-h-[90vh] w-full object-contain"
              loading="eager"
            />
          </div>
        </div>
      )}
    </div>
  );
}
