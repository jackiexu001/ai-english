import { NextResponse, type NextRequest } from 'next/server'

// Lightweight middleware: check auth cookie only, no Supabase SDK.
// @supabase/ssr uses Node.js APIs incompatible with Vercel Edge Runtime.
// Session refresh is handled client-side by the Supabase browser client.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicAsset = pathname.startsWith('/_next') || pathname.includes('.')

  // Supabase sets cookies named "sb-<project-ref>-auth-token"
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasAuthCookie && !isAuthRoute && !isApiRoute && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasAuthCookie && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
