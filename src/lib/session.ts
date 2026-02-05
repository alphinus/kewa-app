/**
 * Unified Session Validation Utilities
 *
 * Single source of truth for session validation.
 * Edge-compatible (no bcrypt dependency).
 * Used by middleware and API routes.
 */

import { jwtVerify, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'

// Session cookie configuration
export const SESSION_COOKIE_NAME = 'session'

// Session expiration: 7 days in seconds
export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7

// Cookie options for session management
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: SESSION_EXPIRATION_SECONDS,
  path: '/'
}

/**
 * Session payload structure stored in JWT
 * Extended for RBAC support
 */
export interface SessionPayload extends JWTPayload {
  userId: string
  role: 'kewa' | 'imeri' // Legacy role for backward compat
  roleId?: string | null // New RBAC role ID
  roleName?: string // New RBAC role name
  permissions?: string[] // Permissions array
}

/**
 * Validated session result (legacy format for backward compat)
 */
export interface ValidatedSession {
  userId: string
  role: 'kewa' | 'imeri'
}

/**
 * Extended validated session with RBAC data
 */
export interface ValidatedSessionWithRBAC extends ValidatedSession {
  roleId: string | null
  roleName: string
  permissions: string[]
}

/**
 * Get session secret from environment
 * Throws in Node.js context, returns null in Edge for graceful handling
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
 * Validate a session token (Edge-compatible)
 * Returns legacy format for backward compatibility.
 *
 * @param token - JWT session token string
 * @returns Validated session or null if invalid/expired
 */
export async function validateSession(token: string): Promise<ValidatedSession | null> {
  try {
    const secretKey = getSessionSecretKey()
    if (!secretKey) {
      return null
    }

    const { payload } = await jwtVerify(token, secretKey)
    const sessionPayload = payload as SessionPayload

    // Validate required fields
    if (!sessionPayload.userId || !sessionPayload.role) {
      return null
    }

    // Validate role is one of allowed values
    if (sessionPayload.role !== 'kewa' && sessionPayload.role !== 'imeri') {
      return null
    }

    return {
      userId: sessionPayload.userId,
      role: sessionPayload.role
    }
  } catch {
    // Token is invalid or expired
    return null
  }
}

/**
 * Validate a session token and return full RBAC data
 *
 * @param token - JWT session token string
 * @returns Full session with RBAC data or null if invalid/expired
 */
export async function validateSessionWithRBAC(token: string): Promise<ValidatedSessionWithRBAC | null> {
  try {
    const secretKey = getSessionSecretKey()
    if (!secretKey) {
      return null
    }

    const { payload } = await jwtVerify(token, secretKey)
    const sessionPayload = payload as SessionPayload

    // Validate required fields
    if (!sessionPayload.userId || !sessionPayload.role) {
      return null
    }

    // Validate role is one of allowed values
    if (sessionPayload.role !== 'kewa' && sessionPayload.role !== 'imeri') {
      return null
    }

    return {
      userId: sessionPayload.userId,
      role: sessionPayload.role,
      roleId: sessionPayload.roleId || null,
      roleName: sessionPayload.roleName || mapLegacyRole(sessionPayload.role),
      permissions: sessionPayload.permissions || []
    }
  } catch {
    // Token is invalid or expired
    return null
  }
}

/**
 * Map legacy role to new role name
 */
function mapLegacyRole(legacyRole: string): string {
  switch (legacyRole) {
    case 'kewa':
      return 'admin'
    case 'imeri':
      return 'property_manager'
    default:
      return legacyRole
  }
}

/**
 * Extract and validate session from Next.js request
 *
 * @param request - NextRequest object
 * @returns Validated session or null if not authenticated
 */
export async function getSessionFromRequest(request: NextRequest): Promise<ValidatedSession | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  return validateSession(sessionCookie.value)
}

/**
 * Extract and validate session with RBAC from Next.js request
 *
 * @param request - NextRequest object
 * @returns Full session with RBAC data or null if not authenticated
 */
export async function getSessionWithRBACFromRequest(request: NextRequest): Promise<ValidatedSessionWithRBAC | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  return validateSessionWithRBAC(sessionCookie.value)
}

/**
 * Extract and validate session from cookie string
 *
 * @param cookieValue - Raw session cookie value
 * @returns Validated session or null if invalid
 */
export async function getSessionFromCookie(cookieValue: string | undefined): Promise<ValidatedSession | null> {
  if (!cookieValue) {
    return null
  }

  return validateSession(cookieValue)
}

/**
 * Get the current authenticated user from server context
 * Convenience wrapper for use in API routes and server components
 *
 * @returns User object with id and role, or null if not authenticated
 */
export async function getCurrentUser(): Promise<{ id: string; role: 'kewa' | 'imeri' } | null> {
  // Dynamic import to avoid bundling issues
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  const session = await validateSession(sessionCookie.value)
  if (!session) {
    return null
  }

  return {
    id: session.userId,
    role: session.role,
  }
}
