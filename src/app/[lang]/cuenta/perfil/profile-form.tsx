'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const { lang } = useParams<{ lang: string }>()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSave() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    })
    setSaving(false); setMsg(res.ok ? 'Guardado' : 'No se pudo guardar')
  }

  return (
    <div className="space-y-4">
      <div><div className="text-sm text-gray-500">Email</div><div className="font-medium">{email}</div></div>
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="rounded-xl border px-3 py-2 hover:bg-gray-50">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
      <div><a href={`/${lang}/cuenta/direcciones`} className="text-sm underline">Gestionar direcciones</a></div>
    </div>
  )
}
