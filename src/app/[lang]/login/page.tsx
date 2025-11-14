'use client'
import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const params = useParams<{ lang: string }>()
  const search = useSearchParams()
  const next = search.get('next') || `/${params.lang}`

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) setError('Email o contraseña incorrectos')
    else router.push(next)
  }

  return (
    <main className="container mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Inicia sesión</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" type="email" autoComplete="email"
                 value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Contraseña</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" type="password" autoComplete="current-password"
                 value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl border px-3 py-2 hover:bg-gray-50">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <div className="mt-6 text-sm text-gray-600">
        <Link href={`/${params.lang}`}>Volver al inicio</Link>
      </div>
    </main>
  )
}
