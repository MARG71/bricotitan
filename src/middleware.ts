import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const LOCALES = ['es','en','de','fr','pt'] as const
const DEFAULT_LOCALE = 'es'
const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Nunca tocar API, _next, ni archivos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Asegurar prefijo de idioma
  const segments = pathname.split('/').filter(Boolean)
  const maybeLocale = segments[0]
  if (!maybeLocale || !LOCALES.includes(maybeLocale as any)) {
    const url = req.nextUrl.clone()
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`
    return NextResponse.redirect(url)
  }

  const lang = maybeLocale
  const rest = `/${segments.slice(1).join('/')}`
  const isAccount = rest.startsWith('/cuenta')
  const isCrm = rest.startsWith('/crm') || rest.startsWith('/admin')

  if (isAccount || isCrm) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) {
      const url = req.nextUrl.clone()
      url.pathname = `/${lang}/login`
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    if (isCrm) {
      const role = token.role as 'ADMIN' | 'GESTOR' | 'CLIENT' | undefined
      if (role !== 'ADMIN' && role !== 'GESTOR') {
        const url = req.nextUrl.clone()
        url.pathname = `/${lang}/unauthorized`
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

// ✅ Grupo NO capturante para que Next no lo rechace
export const config = {
  matcher: [
    // Todo lo que NO sea /api, /_next o un archivo con punto:
    '/((?!(?:api|_next|.*\\..*)).*)',
  ],
}
