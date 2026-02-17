import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'
import { verifyInviteToken } from '@/lib/portal/invite-tokens'
import { createPortalSession, PORTAL_COOKIE_NAME, PORTAL_COOKIE_OPTIONS } from '@/lib/portal/session'
import { createAuthAuditLog } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/portal/auth/register/[token]
 *
 * Invite-based tenant registration endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    const { token } = await params
    const body = await request.json()
    const { password } = body

    // Validate password
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Verify invite token
    const inviteData = await verifyInviteToken(token)
    if (!inviteData) {
      return NextResponse.json(
        { error: 'Token ungültig oder abgelaufen' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up tenant user by tenantUserId from token
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('id, user_id')
      .eq('id', inviteData.tenantUserId)
      .single()

    if (tenantError || !tenantUser) {
      return NextResponse.json(
        { error: 'Mieterregistrierung nicht gefunden' },
        { status: 404 }
      )
    }

    // Check if user already has password (already registered)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password_hash, is_active')
      .eq('id', tenantUser.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    if (user.password_hash) {
      return NextResponse.json(
        { error: 'Bereits registriert' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Update user with password, set auth method and email verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        auth_method: 'email_password',
        email_verified: true,
        is_active: true
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Registrierung' },
        { status: 500 }
      )
    }

    // Create portal session
    const sessionToken = await createPortalSession(user.id)

    // Log successful registration
    await createAuthAuditLog(supabase, {
      action: 'auth.login.email.success',
      userId: user.id,
      ipAddress,
      userAgent,
      details: { role: 'tenant', registration: true, portal: true }
    })

    // Set portal session cookie
    const cookieStore = await cookies()
    cookieStore.set(PORTAL_COOKIE_NAME, sessionToken, PORTAL_COOKIE_OPTIONS)

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Portal registration error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
