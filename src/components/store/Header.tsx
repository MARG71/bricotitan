'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react' // ⬅️ NUEVO

export default function Header({ lang }: { lang: string }) {
  const router = useRouter()
  const pathname = usePathname() || `/${lang}`
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { data: session } = useSession() // ⬅️ NUEVO

  // Buscar al enviar
  function onSearch(e: FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    setOpen(false)
    router.push(`/${lang}/buscar?q=${encodeURIComponent(query)}`)
  }

  // Autocomplete con debounce + abort
  useEffect(() => {
    if (!q || q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
        setOpen(true)
      } catch {
        /* ignoramos abort/errores transitivos */
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  // Helpers UI
  const money = (n?: number) =>
    Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

  // ⬇️ NUEVO: rol y banderita para mostrar "Panel"
  const role = (session?.user as any)?.role as 'ADMIN' | 'GESTOR' | 'CLIENT' | undefined
  const isStaff = role === 'ADMIN' || role === 'GESTOR'

  return (
    <header
      className="
        sticky top-0 z-40
        border-b bg-white/70 backdrop-blur
        supports-[backdrop-filter]:bg-white/60
      "
      aria-label="Cabecera principal"
    >
      {/* Borde superior fino con degradado marca */}
      <div className="h-0.5 w-full bg-gradient-to-r from-brand-primary/80 via-brand-accent/70 to-brand-primary/80" />

      <div className="container-max px-4 py-3 md:py-4 flex items-center gap-4">
        {/* Logo + marca */}
        <Link
          href={`/${lang}`}
          className="group flex items-center gap-2 font-bold text-xl md:text-2xl"
          aria-label="Ir a inicio"
        >
          <span
            className="
              inline-flex h-9 w-9 items-center justify-center rounded-xl
              bg-gradient-to-br from-brand-primary to-brand-accent
              shadow-sm transition-transform group-hover:scale-105
            "
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-white">
              <path fill="currentColor" d="M3 12h18v2H3zm2-6h14v2H5zm4 12h6v2H9z" />
            </svg>
          </span>
          <span
            className="
              bg-gradient-to-r from-brand-primary to-brand-accent
              bg-clip-text text-transparent
              tracking-tight
            "
          >
            BRICOTITAN
          </span>
        </Link>

        {/* Buscador + Autocomplete */}
        <div className="relative flex-1 max-w-2xl">
          <form onSubmit={onSearch} className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.49L21.49 20zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14"
                />
              </svg>
            </span>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => q.length >= 2 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 140)}
              placeholder="Buscar productos, marcas…"
              aria-label="Buscar productos"
              className="
                w-full rounded-2xl border px-10 py-2.5
                shadow-[0_1px_0_rgba(0,0,0,0.04)]
                transition
                focus:outline-none focus:ring-2 focus:ring-brand-accent/60
              "
            />

            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="
                  absolute right-24 top-1/2 -translate-y-1/2
                  rounded-lg border px-2 py-1 text-xs text-gray-600
                  hover:bg-gray-50
                "
                aria-label="Limpiar búsqueda"
              >
                Limpiar
              </button>
            )}

            <button
              type="submit"
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                rounded-xl border px-3 py-1.5 text-sm
                bg-white hover:bg-gray-50
                shadow-sm
              "
              aria-label="Buscar"
            >
              Buscar
            </button>
          </form>

          {open && (
            <div
              className="
                absolute z-30 mt-2 w-full overflow-hidden
                rounded-2xl border bg-white shadow-xl ring-1 ring-black/5
              "
              role="listbox"
              aria-label="Sugerencias de búsqueda"
            >
              {loading && <div className="px-3 py-3 text-sm text-gray-500">Buscando…</div>}
              {!loading && suggestions.length > 0 && (
                <ul className="max-h-96 overflow-auto divide-y divide-gray-100">
                  {suggestions.map((s) => (
                    <li key={s.id} role="option" aria-selected="false">
                      <Link
                        href={`/${lang}/p/${s.slug}`}
                        className="
                          flex items-center gap-3 px-3 py-2
                          hover:bg-gray-50 transition
                        "
                        onClick={() => setOpen(false)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imageUrl ?? '/placeholder.svg'}
                          alt={s.title}
                          className="h-11 w-11 rounded-xl bg-gray-50 object-contain"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[0.95rem] font-medium text-gray-900">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.brand ?? '—'}</div>
                        </div>
                        {typeof s.price === 'number' && (
                          <div className="ml-auto text-sm font-semibold text-gray-800">
                            {money(s.price)}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {!loading && suggestions.length === 0 && q.length >= 2 && (
                <div className="px-3 py-4 text-sm text-gray-500">
                  Sin resultados para <span className="font-medium">&quot;{q}&quot;</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href={`/${lang}/ofertas`}
            className="
              rounded-xl border px-3 py-2 text-sm text-gray-700
              hover:bg-gray-50 transition
            "
          >
            Ofertas
          </Link>

          <Link
            href={`/${lang}/carrito`}
            className="
              inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm
              hover:bg-gray-50 transition
            "
            aria-label="Ir al carrito"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-700">
              <path
                fill="currentColor"
                d="M7 18c-.83 0-1.54.5-1.84 1.22C4.4 20.17 5.13 21 6 21s1.6-.83 1.84-1.78C8.5 18.5 7.83 18 7 18m10 0c-.83 0-1.5.5-1.84 1.22C14.4 20.17 15.13 21 16 21s1.6-.83 1.84-1.78C17.5 18.5 16.83 18 16 18M7.16 14h8.96c.64 0 1.2-.4 1.42-1l2.46-6.5A1 1 0 0 0 19 5H6.21l-.94-2H2v2h2l3.6 7.59l-1.35 2.44C5.89 15.37 6.37 16 7 16h12v-2z"
              />
            </svg>
            Carrito
          </Link>

          {/* ⬇️ NUEVO: acceso según sesión/rol */}
          {!session?.user ? (
            <Link
              href={`/${lang}/login?next=${encodeURIComponent(pathname)}`}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 transition"
            >
              Entrar
            </Link>
          ) : (
            <>
              <span className="text-sm text-gray-700">
                {session.user.name || session.user.email} · {(session.user as any).role}
              </span>
              <Link
                href={`/${lang}/cuenta/perfil`}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cuenta
              </Link>
              {isStaff && (
                <Link
                  href={`/${lang}/admin`}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Panel
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: `/${lang}` })}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Salir
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
