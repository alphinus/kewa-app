import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// Cost factor for bcrypt hashing
const BCRYPT_ROUNDS = 10

// Session expiration: 7 days in seconds
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7

// Get session secret from environment
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

// Session payload type
interface SessionPayload extends JWTPayload {
  userId: string
  role: 'kewa' | 'imeri'
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
 */
export async function getSession(token: string): Promise<{ userId: string; role: 'kewa' | 'imeri' } | null> {
  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret)

    const sessionPayload = payload as SessionPayload

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
 * Cookie configuration for session
 */
export const SESSION_COOKIE_NAME = 'session'
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_EXPIRATION_SECONDS,
  path: '/'
}
