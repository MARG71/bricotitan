'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Suggest = {
  q: string;
  suggestions: Array<{ id: string; slug: string; title: string; brand?: string; imageUrl?: string; price?: number }>;
  categories: string[];
  brands: string[];
};

export default function Autocomplete({ lang = 'es', initialQ = '' }: { lang?: string; initialQ?: string }) {
  const [q, setQ] = useState(initialQ);
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!q || q.length < 2) {
      setData(null);
      return;
    }
    abortRef.current?.abort();
    const c = new AbortController();
    abortRef.current = c;

    const t = setTimeout(async () => {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&limit=8`, { signal: c.signal });
      if (!res.ok) return;
      const json = (await res.json()) as Suggest;
      setData(json);
      setOpen(true);
    }, 180);
    return () => { clearTimeout(t); c.abort(); };
  }, [q]);

  function submit() {
    const url = `/${lang}/buscar?q=${encodeURIComponent(q)}`;
    router.push(url);
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <input
        className="w-full rounded-xl border px-4 py-2"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => data && setOpen(true)}
        placeholder="Buscar productos…"
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <button
        onClick={submit}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
      >
        Buscar
      </button>

      {open && data && data.suggestions.length > 0 && (
        <div
          className="absolute z-20 mt-2 w-full rounded-2xl border bg-white shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <ul className="max-h-80 overflow-auto divide-y">
            {data.suggestions.map((s) => (
              <li key={s.id}>
                <a
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                  href={`/${lang}/p/${s.slug}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl ?? '/placeholder.svg'}
                    alt={s.title}
                    className="h-10 w-10 rounded-lg object-contain bg-gray-50"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-gray-500">{s.brand ?? '—'}</div>
                  </div>
                  {typeof s.price === 'number' && (
                    <div className="ml-auto text-sm font-semibold">
                      {Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(s.price)}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
