import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth'
import { createPortalSession, PORTAL_COOKIE_NAME, PORTAL_COOKIE_OPTIONS } from '@/lib/portal/session'
import { createAuthAuditLog } from '@/lib/audit'

/**
 * POST /api/portal/auth/login
 *
 * Tenant email+password login endpoint
 */
export async function POST(request: NextRequest) {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find user by email with tenant role
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        password_hash,
        display_name,
        is_active,
        auth_method,
        role_id,
        roles!inner (
          name
        )
      `)
      .eq('email', email.toLowerCase().trim())
      .eq('roles.name', 'tenant')
      .single()

    if (error || !user) {
      await createAuthAuditLog(supabase, {
        action: 'auth.login.email.failure',
        userId: null,
        ipAddress,
        userAgent,
        details: { email, reason: 'user_not_found' }
      })

      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }

    // Check password
    if (!user.password_hash) {
      await createAuthAuditLog(supabase, {
        action: 'auth.login.email.failure',
        userId: user.id,
        ipAddress,
        userAgent,
        details: { reason: 'no_password_set' }
      })

      return NextResponse.json(
        { error: 'Passwort nicht gesetzt. Bitte Einladungslink verwenden.' },
        { status: 401 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      await createAuthAuditLog(supabase, {
        action: 'auth.login.email.failure',
        userId: user.id,
        ipAddress,
        userAgent,
        details: { reason: 'invalid_password' }
      })

      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }

    // Check if account is active
    if (!user.is_active) {
      await createAuthAuditLog(supabase, {
        action: 'auth.login.email.failure',
        userId: user.id,
        ipAddress,
        userAgent,
        details: { reason: 'account_inactive' }
      })

      return NextResponse.json(
        { error: 'Konto deaktiviert' },
        { status: 403 }
      )
    }

    // Create portal session
    const sessionToken = await createPortalSession(user.id)

    // Update login stats
    const currentLoginCount = (user as unknown as { login_count?: number })?.login_count || 0
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: currentLoginCount + 1
      })
      .eq('id', user.id)

    // Log successful login
    await createAuthAuditLog(supabase, {
      action: 'auth.login.email.success',
      userId: user.id,
      ipAddress,
      userAgent,
      details: { role: 'tenant', portal: true }
    })

    // Set portal session cookie
    const cookieStore = await cookies()
    cookieStore.set(PORTAL_COOKIE_NAME, sessionToken, PORTAL_COOKIE_OPTIONS)

    return NextResponse.json({
      success: true,
      displayName: user.display_name
    })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
