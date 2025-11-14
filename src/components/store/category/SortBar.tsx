'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Props = {
  lang: string
  slug: string
  sort: 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc' | 'newest'
}

export default function SortBar({ sort }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateSort(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', next)
    params.set('page', '1') // reset paginación al cambiar orden
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <label className="text-sm text-zinc-600">Ordenar por</label>
      <select
        className="rounded-lg border px-3 py-2 bg-white"
        value={sort}
        onChange={(e) => updateSort(e.target.value)}
      >
        <option value="newest">Novedades</option>
        <option value="priceAsc">Precio ↑</option>
        <option value="priceDesc">Precio ↓</option>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
      </select>
    </div>
  )
}
