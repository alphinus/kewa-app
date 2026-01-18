import { NextRequest, NextResponse } from 'next/server'
import {
  validateSession,
  validateSessionWithRBAC,
  getSessionFromRequest,
  getSessionWithRBACFromRequest,
  SESSION_COOKIE_NAME
} from '@/lib/session'
import {
  getRoutePermissions,
  hasAnyPermission,
  isInternalRole
} from '@/lib/permissions'

/**
 * Middleware for authentication and authorization
 *
 * Handles:
 * - Session validation for all protected routes
 * - Permission checking for API routes
 * - Contractor portal access via magic link
 * - Response headers for downstream route handlers
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Special handling for contractor portal routes
  if (pathname.startsWith('/contractor')) {
    return handleContractorRoute(request)
  }

  // Validate session using unified utility
  const session = await getSessionWithRBACFromRequest(request)

  // No valid session - redirect to login
  if (!session) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Dashboard routes redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // For API routes, check permissions
  if (pathname.startsWith('/api/')) {
    const method = request.method
    const requiredPermissions = getRoutePermissions(method, pathname)

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!hasAnyPermission(session.permissions, requiredPermissions)) {
        return NextResponse.json(
          { error: 'Keine Berechtigung' },
          { status: 403 }
        )
      }
    }
  }

  // For dashboard routes, check if internal role
  if (pathname.startsWith('/dashboard')) {
    if (!isInternalRole(session.roleName)) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }
  }

  // Valid session - continue with session data in response headers
  // Next.js 16+: Use response headers instead of deprecated request header mutation
  const response = NextResponse.next()

  // Legacy headers for backward compatibility
  response.headers.set('x-user-id', session.userId)
  response.headers.set('x-user-role', session.role)

  // New RBAC headers
  response.headers.set('x-user-role-id', session.roleId || '')
  response.headers.set('x-user-role-name', session.roleName)
  response.headers.set('x-user-permissions', session.permissions.join(','))

  return response
}

/**
 * Handle contractor portal routes
 *
 * Contractors access via magic link token, not standard session.
 * They have a session after first access, but limited to their work orders.
 */
async function handleContractorRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl

  // Check for magic link token in query params
  const token = searchParams.get('token')

  if (token) {
    // Redirect to magic link verification endpoint
    // This will validate the token and create a session
    return NextResponse.redirect(
      new URL(`/api/auth/magic-link/verify?token=${token}`, request.url)
    )
  }

  // No token - check for existing session
  const session = await getSessionWithRBACFromRequest(request)

  if (!session) {
    // No session - redirect to login with error
    return NextResponse.redirect(
      new URL('/login?error=contractor_access_required', request.url)
    )
  }

  // Check if contractor role
  if (session.roleName !== 'external_contractor') {
    // Internal users can also view contractor portal for testing
    if (!isInternalRole(session.roleName)) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      )
    }
  }

  // Valid contractor session - continue
  const response = NextResponse.next()

  response.headers.set('x-user-id', session.userId)
  response.headers.set('x-user-role', session.role)
  response.headers.set('x-user-role-name', session.roleName)
  response.headers.set('x-user-permissions', session.permissions.join(','))

  return response
}

// Re-export for testing/verification
export { validateSession, validateSessionWithRBAC }

// Protect:
// - /dashboard/* routes (internal app)
// - /api/* routes (except /api/auth/*)
// - /contractor/* routes (contractor portal)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!auth).*)',
    '/contractor/:path*'
  ]
}
