import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { jwtVerify, type JWTPayload } from 'jose'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession, PORTAL_COOKIE_NAME, PORTAL_COOKIE_OPTIONS } from '@/lib/portal/session'
import { createAuthAuditLog } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

interface QRTokenPayload extends JWTPayload {
  userId: string
  type: 'qr_login'
}

/**
 * POST /api/portal/auth/qr-login
 *
 * Login via QR code token
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token erforderlich' },
        { status: 400 }
      )
    }

    const secret = process.env.SESSION_SECRET
    if (!secret) {
      throw new Error('SESSION_SECRET not configured')
    }

    const secretKey = new TextEncoder().encode(secret)

    // Verify QR token
    let payload: QRTokenPayload
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secretKey)
      payload = verifiedPayload as QRTokenPayload

      if (payload.type !== 'qr_login') {
        return NextResponse.json(
          { error: 'Ungültiger Token-Typ' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Token ungültig oder abgelaufen' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Look up user and verify tenant role and active status
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        is_active,
        roles!inner (
          name
        )
      `)
      .eq('id', payload.userId)
      .eq('roles.name', 'tenant')
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Konto deaktiviert' },
        { status: 403 }
      )
    }

    // Create portal session
    const sessionToken = await createPortalSession(user.id)

    // Log QR login
    await createAuthAuditLog(supabase, {
      action: 'auth.login.email.success',
      userId: user.id,
      ipAddress,
      userAgent,
      details: { role: 'tenant', qr_login: true, portal: true }
    })

    // Set portal session cookie
    const cookieStore = await cookies()
    cookieStore.set(PORTAL_COOKIE_NAME, sessionToken, PORTAL_COOKIE_OPTIONS)

    return NextResponse.json({
      success: true,
      redirectUrl: '/portal'
    })
  } catch (error) {
    console.error('QR login error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
