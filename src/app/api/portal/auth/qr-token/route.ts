import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getPortalUser } from '@/lib/portal/session'
import { checkRateLimit } from '@/lib/rate-limit'

const QR_TOKEN_EXPIRATION_SECONDS = 5 * 60 // 5 minutes

/**
 * POST /api/portal/auth/qr-token
 *
 * Generate short-lived QR login token for multi-device access
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Validate portal session (must be logged in)
    const user = await getPortalUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const secret = process.env.SESSION_SECRET
    if (!secret) {
      throw new Error('SESSION_SECRET not configured')
    }

    const secretKey = new TextEncoder().encode(secret)

    // Create short-lived token
    const token = await new SignJWT({
      userId: user.id,
      type: 'qr_login'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${QR_TOKEN_EXPIRATION_SECONDS}s`)
      .sign(secretKey)

    const expiresAt = new Date(Date.now() + QR_TOKEN_EXPIRATION_SECONDS * 1000).toISOString()

    return NextResponse.json({
      token,
      expiresAt
    })
  } catch (error) {
    console.error('QR token generation error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
