import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

// Re-export session utilities for backward compatibility
// These are the canonical session utilities - use them directly from @/lib/session
export {
  validateSession,
  getSessionFromRequest,
  getSessionFromCookie,
  getCurrentUser,
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
 * Hash a password for storage (for email+password auth)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Session creation options for new RBAC system
 */
export interface CreateSessionOptions {
  userId: string
  role: 'kewa' | 'imeri' // Legacy role for backward compat
  roleId?: string | null
  roleName?: string
  permissions?: string[]
}

/**
 * Create a session token for a user
 * Supports both legacy and new RBAC session data
 *
 * @param options - Session creation options or legacy (userId, role) params
 */
export async function createSession(
  options: CreateSessionOptions | string,
  legacyRole?: 'kewa' | 'imeri'
): Promise<string> {
  const { SESSION_EXPIRATION_SECONDS } = await import('./session')
  const secret = getSessionSecret()

  // Support legacy signature: createSession(userId, role)
  if (typeof options === 'string') {
    const token = await new SignJWT({
      userId: options,
      role: legacyRole!
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
      .sign(secret)

    return token
  }

  // New RBAC session creation
  const token = await new SignJWT({
    userId: options.userId,
    role: options.role, // Keep legacy role for backward compat
    roleId: options.roleId || null,
    roleName: options.roleName || mapLegacyRole(options.role),
    permissions: options.permissions || []
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
    .sign(secret)

  return token
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
 * Validate and decode a session token
 * Returns user info if valid, null if expired or invalid
 *
 * @deprecated Use validateSession from @/lib/session instead
 */
export async function getSession(token: string): Promise<{ userId: string; role: 'kewa' | 'imeri' } | null> {
  const { validateSession } = await import('./session')
  return validateSession(token)
}
