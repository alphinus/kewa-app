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
  sameSite: 'lax' as const,
  maxAge: SESSION_EXPIRATION_SECONDS,
  path: '/'
}

/**
 * Session payload structure stored in JWT
 */
export interface SessionPayload extends JWTPayload {
  userId: string
  role: 'kewa' | 'imeri'
}

/**
 * Validated session result
 */
export interface ValidatedSession {
  userId: string
  role: 'kewa' | 'imeri'
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
