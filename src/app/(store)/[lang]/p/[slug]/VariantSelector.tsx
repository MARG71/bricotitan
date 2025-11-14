'use client'

import { useRouter } from 'next/navigation'

type Variante = { id: number; slug: string; itemCombo?: string | null }

export default function VariantSelector({
  variantes,
  currentId,
  lang,
  label,
}: {
  variantes: Variante[]
  currentId: number
  lang: string
  label?: string | null
}) {
  const router = useRouter()

  return (
    <div className="rounded-2xl border bg-white p-4">
      <label className="block text-sm font-medium mb-2">
        {label || 'Variantes'}
      </label>

      <select
        className="w-full rounded-lg border p-2"
        value={currentId}
        onChange={(e) => {
          const selectedId = Number(e.target.value)
          const selected = variantes.find((v) => v.id === selectedId)
          if (selected?.slug) {
            router.push(`/${lang}/p/${selected.slug}`)
          }
        }}
      >
        {variantes.map((v) => (
          <option key={v.id} value={v.id}>
            {v.itemCombo ?? v.slug}
          </option>
        ))}
      </select>
    </div>
  )
}
