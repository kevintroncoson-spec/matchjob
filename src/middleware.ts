import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Rutas protegidas que requieren sesión
  const protectedRoutes = ['/feed', '/dashboard', '/perfil', '/onboarding', '/admin', '/empresa']
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))

  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // La verificación fina de rol (admin/empresa/candidato) se hace en cada layout,
  // porque el middleware no debe hacer queries pesadas a la BD en cada request.

  return res
}

export const config = {
  matcher: [
    '/feed/:path*',
    '/dashboard/:path*',
    '/perfil/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
    '/empresa/:path*',
  ],
}
