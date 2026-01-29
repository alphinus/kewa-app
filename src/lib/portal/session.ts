/**
 * Portal Session Management
 *
 * Portal-specific session utilities for tenant authentication.
 * Uses separate cookie from operator session to prevent interference.
 */

import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'

// Portal session cookie configuration
export const PORTAL_COOKIE_NAME = 'portal_session'

// Portal session expiration: 30 days in seconds (for mobile users)
export const PORTAL_SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 30

// Cookie options for portal session management
export const PORTAL_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: PORTAL_SESSION_EXPIRATION_SECONDS,
  path: '/portal'
}

/**
 * Portal session payload structure stored in JWT
 */
export interface PortalSessionPayload extends JWTPayload {
  userId: string
  role: 'tenant'
  type: 'portal'
}

/**
 * Validated portal session result
 */
export interface ValidatedPortalSession {
  userId: string
}

/**
 * Get session secret from environment
 */
function getSessionSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    console.error('SESSION_SECRET environment variable not set')
    return null
  }
  return new TextEncoder().encode(secret)
}

/**
 * Create a portal session token for a tenant user
 *
 * @param userId - User ID of the tenant
 * @returns JWT session token string
 */
export async function createPortalSession(userId: string): Promise<string> {
  const secretKey = getSessionSecretKey()
  if (!secretKey) {
    throw new Error('SESSION_SECRET not configured')
  }

  const token = await new SignJWT({
    userId,
    role: 'tenant',
    type: 'portal'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_SESSION_EXPIRATION_SECONDS}s`)
    .sign(secretKey)

  return token
}

/**
 * Validate a portal session token
 *
 * @param token - JWT session token string
 * @returns Validated session or null if invalid/expired
 */
export async function validatePortalSession(token: string): Promise<ValidatedPortalSession | null> {
  try {
    const secretKey = getSessionSecretKey()
    if (!secretKey) {
      return null
    }

    const { payload } = await jwtVerify(token, secretKey)
    const sessionPayload = payload as PortalSessionPayload

    // Validate required fields and type
    if (!sessionPayload.userId || sessionPayload.type !== 'portal') {
      return null
    }

    return {
      userId: sessionPayload.userId
    }
  } catch {
    // Token is invalid or expired
    return null
  }
}

/**
 * Extract and validate portal session from Next.js request
 *
 * @param request - NextRequest object
 * @returns Validated session or null if not authenticated
 */
export async function getPortalSessionFromRequest(request: NextRequest): Promise<ValidatedPortalSession | null> {
  const sessionCookie = request.cookies.get(PORTAL_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  return validatePortalSession(sessionCookie.value)
}

/**
 * Get the current authenticated portal user from server context
 * Convenience wrapper for use in API routes and server components
 *
 * @returns User object with id, or null if not authenticated
 */
export async function getPortalUser(): Promise<{ id: string } | null> {
  // Dynamic import to avoid bundling issues
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(PORTAL_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  const session = await validatePortalSession(sessionCookie.value)
  if (!session) {
    return null
  }

  return {
    id: session.userId
  }
}
