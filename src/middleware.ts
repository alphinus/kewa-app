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
import { validateContractorAccess } from '@/lib/magic-link'

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
 * Contractors access via magic link token in the URL path.
 * URLs are: /contractor/{token} or /contractor/{token}/{workOrderId}
 *
 * Token is validated BEFORE checking for session, allowing
 * first-time access without prior authentication.
 */
async function handleContractorRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Extract token from path: /contractor/{token} or /contractor/{token}/{workOrderId}
  // The token is always the first path segment after /contractor/
  const pathSegments = pathname.split('/').filter(Boolean)
  // pathSegments = ['contractor', '{token}'] or ['contractor', '{token}', '{workOrderId}']

  if (pathSegments.length < 2) {
    // No token in path - redirect to login
    return NextResponse.redirect(
      new URL('/login?error=contractor_access_required', request.url)
    )
  }

  const token = pathSegments[1] // First segment after 'contractor'

  // Validate token using magic link validation (status-aware expiry)
  const validation = await validateContractorAccess(token)

  if (!validation.valid) {
    // Token is invalid - redirect to login with specific error
    const errorParam = validation.error || 'invalid_token'
    return NextResponse.redirect(
      new URL(`/login?error=${errorParam}`, request.url)
    )
  }

  // Token is valid - allow access
  // The page component will handle session creation and rendering
  const response = NextResponse.next()

  // Pass contractor email via header for downstream use
  if (validation.email) {
    response.headers.set('x-contractor-email', validation.email)
  }
  if (validation.workOrderId) {
    response.headers.set('x-work-order-id', validation.workOrderId)
  }

  // Mark as contractor access
  response.headers.set('x-user-role-name', 'external_contractor')

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
