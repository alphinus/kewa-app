import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, type JWTPayload } from 'jose'

// Session payload type (same as in auth.ts)
interface SessionPayload extends JWTPayload {
  userId: string
  role: 'kewa' | 'imeri'
}

const SESSION_COOKIE_NAME = 'session'

/**
 * Validate session token in Edge runtime
 * Duplicated from auth.ts because middleware runs in Edge runtime
 * and cannot import bcrypt (Node.js only)
 */
async function validateSession(token: string): Promise<{ userId: string; role: 'kewa' | 'imeri' } | null> {
  try {
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      console.error('SESSION_SECRET not set')
      return null
    }

    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    const sessionPayload = payload as SessionPayload

    if (!sessionPayload.userId || !sessionPayload.role) {
      return null
    }

    if (sessionPayload.role !== 'kewa' && sessionPayload.role !== 'imeri') {
      return null
    }

    return {
      userId: sessionPayload.userId,
      role: sessionPayload.role
    }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  // No session cookie - redirect to login
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Validate session
  const session = await validateSession(sessionCookie.value)

  if (!session) {
    // Invalid or expired session - redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    // Clear invalid cookie
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Valid session - continue with role in headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', session.userId)
  requestHeaders.set('x-user-role', session.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

// Protect /dashboard/* routes and /api/* routes (except /api/auth/*)
export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!auth).*)']
}
