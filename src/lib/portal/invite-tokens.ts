/**
 * Invite Token System
 *
 * JWT-based invite token generation and verification for tenant registration.
 * Invite tokens are single-use and expire after 7 days.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// Invite token expiration: 7 days in seconds
const INVITE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60

/**
 * Invite token payload structure
 */
interface InviteTokenPayload extends JWTPayload {
  tenantUserId: string
  email: string
  type: 'tenant_invite'
}

/**
 * Verified invite token result
 */
export interface VerifiedInviteToken {
  tenantUserId: string
  email: string
}

/**
 * Get session secret from environment
 */
function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Generate an invite token for a tenant user
 *
 * @param tenantUserId - ID from tenant_users table
 * @param email - Tenant's email address
 * @returns JWT invite token string
 */
export async function generateInviteToken(
  tenantUserId: string,
  email: string
): Promise<string> {
  const secretKey = getSessionSecretKey()

  const token = await new SignJWT({
    tenantUserId,
    email,
    type: 'tenant_invite'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${INVITE_EXPIRATION_SECONDS}s`)
    .sign(secretKey)

  return token
}

/**
 * Verify an invite token
 *
 * @param token - JWT invite token string
 * @returns Verified token data or null if invalid/expired
 */
export async function verifyInviteToken(token: string): Promise<VerifiedInviteToken | null> {
  try {
    const secretKey = getSessionSecretKey()

    const { payload } = await jwtVerify(token, secretKey)
    const invitePayload = payload as InviteTokenPayload

    // Validate required fields and type
    if (!invitePayload.tenantUserId || !invitePayload.email || invitePayload.type !== 'tenant_invite') {
      return null
    }

    return {
      tenantUserId: invitePayload.tenantUserId,
      email: invitePayload.email
    }
  } catch {
    // Token is invalid or expired
    return null
  }
}

/**
 * Generate a full invite URL with token
 *
 * @param token - JWT invite token string
 * @returns Full URL to registration page
 */
export function generateInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/portal/register/${token}`
}
