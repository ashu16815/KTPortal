import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/_next', '/api/auth', '/api/users', '/favicon.ico']
const COOKIE_NAME = 'kt_stub_session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files
  if (pathname.match(/\.(ico|png|jpg|svg|css|js)$/)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)

  if (!sessionCookie?.value) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    }
    // UI routes redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based guards for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'))
      if (session.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard/executive', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
