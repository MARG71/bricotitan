// src/app/[lang]/cuenta/perfil/page.tsx
import { requireAuth } from '@/lib/auth'
import ProfileForm from './ProfileForm'

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

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tu perfil</h1>

      <ProfileForm
        initialName={session.user.name ?? ''}
        email={session.user.email ?? ''}
      />
    </main>
  )
}
