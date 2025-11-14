import Link from 'next/link'

type Props = {
  lang: string
  slug: string
  total: number
  page: number
  pageSize: number
  sort?: string
}

function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize))
}

export default function Pagination({ lang, slug, total, page, pageSize, sort }: Props) {
  const last = pageCount(total, pageSize)
  if (last <= 1) return null

  const base = `/${lang}/c/${slug}`
  const q = (p: number) => `${base}?page=${p}${sort ? `&sort=${encodeURIComponent(sort)}` : ''}`

  // ventana de paginación compacta
  const pages = []
  const window = 2
  const start = Math.max(1, page - window)
  const end = Math.min(last, page + window)

  for (let p = start; p <= end; p++) {
    pages.push(
      <Link
        key={p}
        href={q(p)}
        className={`px-3 py-2 rounded-lg border ${p === page ? 'bg-brand-primary text-white' : 'bg-white'}`}
      >
        {p}
      </Link>
    )
  }

  return (
    <nav className="mt-6 flex items-center justify-center gap-2">
      <Link href={q(Math.max(1, page - 1))} className="px-3 py-2 rounded-lg border bg-white">
        Anterior
      </Link>
      {start > 1 && <span className="px-2 text-zinc-500">…</span>}
      {pages}
      {end < last && <span className="px-2 text-zinc-500">…</span>}
      <Link href={q(Math.min(last, page + 1))} className="px-3 py-2 rounded-lg border bg-white">
        Siguiente
      </Link>
    </nav>
  )
}
