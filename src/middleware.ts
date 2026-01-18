import { NextRequest, NextResponse } from 'next/server'
import {
  validateSession,
  getSessionFromRequest,
  SESSION_COOKIE_NAME
} from '@/lib/session'

export async function middleware(request: NextRequest) {
  // Validate session using unified utility
  const session = await getSessionFromRequest(request)

  // No valid session - redirect to login
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    // Clear potentially invalid cookie
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Valid session - continue with role in response headers for downstream use
  // Next.js 16+: Use response headers instead of deprecated request header mutation
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.userId)
  response.headers.set('x-user-role', session.role)

  return response
}

// Re-export validateSession for testing/verification
export { validateSession }

// Protect /dashboard/* routes and /api/* routes (except /api/auth/*)
export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!auth).*)']
}
