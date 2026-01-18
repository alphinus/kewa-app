import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

// Re-export session utilities for backward compatibility
// These are the canonical session utilities - use them directly from @/lib/session
export {
  validateSession,
  getSessionFromRequest,
  getSessionFromCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_EXPIRATION_SECONDS,
  type SessionPayload,
  type ValidatedSession
} from './session'

// Cost factor for bcrypt hashing
const BCRYPT_ROUNDS = 10

// Get session secret from environment
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Hash a PIN for storage
 * Used for generating initial PIN hashes
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS)
}

/**
 * Verify a PIN against a stored hash
 * Returns true if PIN matches hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Create a session token for a user
 * Token expires after 7 days
 */
export async function createSession(userId: string, role: 'kewa' | 'imeri'): Promise<string> {
  const { SESSION_EXPIRATION_SECONDS } = await import('./session')
  const secret = getSessionSecret()

  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
    .sign(secret)

  return token
}

/**
 * Validate and decode a session token
 * Returns user info if valid, null if expired or invalid
 *
 * @deprecated Use validateSession from @/lib/session instead
 */
export async function getSession(token: string): Promise<{ userId: string; role: 'kewa' | 'imeri' } | null> {
  const { validateSession } = await import('./session')
  return validateSession(token)
}
