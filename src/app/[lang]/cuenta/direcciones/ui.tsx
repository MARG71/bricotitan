'use client'
import { useState } from 'react'

type Address = {
  id: number; name: string | null; fullName: string; phone: string | null;
  line1: string; line2: string | null; city: string; region: string | null;
  postal: string; country: string; isDefault: boolean
}

export default function AddressesClient({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial)
  const [saving, setSaving] = useState(false)

async function add(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  // Guarda la referencia del form ANTES del await (evita que sea null)
  const formEl = e.currentTarget;
  const form = new FormData(formEl);

  setSaving(true);
  try {
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return;

    const created = await res.json();
    setList((prev) => [created, ...prev]);

    // Ahora sí, puedes resetear el formulario con la referencia guardada
    formEl.reset();
  } finally {
    setSaving(false);
  }
}


  async function remove(id: number) {
    const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setList((prev)=>prev.filter(a=>a.id !== id))
  }

  async function makeDefault(id: number) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setList((prev)=>prev.map(a=>a.id===id?updated:{...a, isDefault:false}))
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={add} className="grid gap-3 rounded-2xl border p-4">
        <div className="grid gap-1">
          <label className="text-sm">Nombre (alias)</label>
          <input name="name" className="rounded-xl border px-3 py-2" placeholder="Casa" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Nombre completo</label>
          <input name="fullName" className="rounded-xl border px-3 py-2" required />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Teléfono</label>
          <input name="phone" className="rounded-xl border px-3 py-2" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Dirección</label>
          <input name="line1" className="rounded-xl border px-3 py-2" required />
          <input name="line2" className="rounded-xl border px-3 py-2" placeholder="Escalera, piso, etc." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1"><label className="text-sm">Ciudad</label><input name="city" className="rounded-xl border px-3 py-2" required /></div>
          <div className="grid gap-1"><label className="text-sm">Provincia</label><input name="region" className="rounded-xl border px-3 py-2" /></div>
          <div className="grid gap-1"><label className="text-sm">CP</label><input name="postal" className="rounded-xl border px-3 py-2" required /></div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm">País</label>
          <input name="country" className="rounded-xl border px-3 py-2" defaultValue="ES" required />
        </div>
        <button disabled={saving} className="rounded-xl border px-3 py-2 hover:bg-gray-50">
          {saving ? 'Guardando…' : 'Añadir'}
        </button>
      </form>

      <div className="grid gap-3">
        {list.map((a)=>(
          <div key={a.id} className="rounded-2xl border p-4 flex items-start gap-4">
            <div className="flex-1">
              <div className="font-medium">
                {a.name || 'Sin alias'} {a.isDefault && <span className="ml-2 text-xs rounded bg-gray-100 px-2 py-0.5">Predeterminada</span>}
              </div>
              <div className="text-sm text-gray-600">{a.fullName} · {a.phone || '—'}</div>
              <div className="text-sm text-gray-700">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''} · {a.postal} {a.city} {a.region ? `(${a.region})` : ''} · {a.country}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!a.isDefault && (
                <button onClick={()=>makeDefault(a.id)} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Predeterminar</button>
              )}
              <button onClick={()=>remove(a.id)} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Eliminar</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm text-gray-600">Aún no tienes direcciones.</div>}
      </div>
    </div>
  )
}
