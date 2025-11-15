// src/app/[lang]/cuenta/perfil/page.tsx
// src/app/[lang]/cuenta/perfil/page.tsx
import { requireAuth } from '@/lib/auth'

// Sesión mínima que necesitamos
type AuthSession = {
  user: {
    id: string
    email?: string | null
    name?: string | null
  }
}

export default async function PerfilPage() {
  const session = (await requireAuth()) as AuthSession
  const name = session.user.name ?? ''
  const email = session.user.email ?? ''

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold mb-2">Tu perfil</h1>
        <p className="text-sm text-zinc-600">
          Aquí puedes ver los datos básicos de tu cuenta.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            readOnly
            className="w-full rounded-md border px-3 py-2 text-sm bg-zinc-50 text-zinc-800"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-md border px-3 py-2 text-sm bg-zinc-50 text-zinc-800"
          />
        </div>

        <p className="text-xs text-zinc-500 pt-2">
          (Edición del perfil pendiente de implementar. De momento los datos se
          muestran en modo solo lectura.)
        </p>
      </section>
    </main>
  )
}
