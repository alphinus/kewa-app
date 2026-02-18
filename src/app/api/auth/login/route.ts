import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createPublicClient } from '@/lib/supabase/with-org'
import { verifyPin, verifyPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth'
import { createAuthAuditLog } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/login
 *
 * Unified login endpoint supporting:
 * - PIN authentication (internal users: admin, property_manager, accounting)
 * - Email+Password authentication (tenants)
 *
 * Magic link auth is handled separately via /api/auth/magic-link/verify
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
    const { pin, email, password } = body

    const supabase = await createPublicClient()

    // Determine auth method based on input
    if (pin && typeof pin === 'string') {
      // PIN-based authentication
      return await handlePinAuth(supabase, pin, ipAddress, userAgent)
    } else if (email && password) {
      // Email+Password authentication
      return await handleEmailAuth(supabase, email, password, ipAddress, userAgent)
    } else {
      return NextResponse.json(
        { error: 'PIN oder Email+Passwort erforderlich' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

/**
 * Handle PIN-based authentication
 */
async function handlePinAuth(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  pin: string,
  ipAddress: string,
  userAgent: string
): Promise<NextResponse> {
  // Query users with PIN auth method, joined with role
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      pin_hash,
      role,
      display_name,
      is_active,
      auth_method,
      role_id,
      roles (
        id,
        name,
        display_name,
        is_internal
      )
    `)
    .eq('auth_method', 'pin')

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Datenbankfehler' },
      { status: 500 }
    )
  }

  if (!users || users.length === 0) {
    return NextResponse.json(
      { error: 'Keine Benutzer gefunden' },
      { status: 500 }
    )
  }

  // Find matching user by comparing PIN with each hash
  let matchedUser: typeof users[0] | null = null

  for (const user of users) {
    const isMatch = await verifyPin(pin, user.pin_hash)
    if (isMatch) {
      matchedUser = user
      break
    }
  }

  if (!matchedUser) {
    // Log failed attempt (no user_id since we don't know who)
    await createAuthAuditLog(supabase, {
      action: 'auth.login.pin.failure',
      userId: null,
      ipAddress,
      userAgent,
      details: { reason: 'invalid_pin' }
    })

    return NextResponse.json(
      { error: 'Ungültiger PIN' },
      { status: 401 }
    )
  }

  // Check if user is active
  if (!matchedUser.is_active) {
    await createAuthAuditLog(supabase, {
      action: 'auth.login.pin.failure',
      userId: matchedUser.id,
      ipAddress,
      userAgent,
      details: { reason: 'account_inactive' }
    })

    return NextResponse.json(
      { error: 'Konto deaktiviert' },
      { status: 403 }
    )
  }

  // Get permissions for the user's role
  const permissions = await getUserPermissions(supabase, matchedUser.role_id)

  // Create session token with new RBAC data
  // Supabase returns related data, handle the structure
  const rolesData = matchedUser.roles as unknown
  const roleData = (Array.isArray(rolesData) ? rolesData[0] : rolesData) as { name: string; display_name: string; is_internal: boolean } | null
  const sessionToken = await createSession({
    userId: matchedUser.id,
    role: matchedUser.role as 'kewa' | 'imeri', // Legacy role for backward compat
    roleId: matchedUser.role_id,
    roleName: roleData?.name || mapLegacyRole(matchedUser.role),
    permissions
  })

  // Update login stats
  const currentLoginCount = (matchedUser as unknown as { login_count?: number })?.login_count || 0
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: currentLoginCount + 1
    })
    .eq('id', matchedUser.id)

  // Log successful login
  await createAuthAuditLog(supabase, {
    action: 'auth.login.pin.success',
    userId: matchedUser.id,
    ipAddress,
    userAgent,
    details: { role: roleData?.name || matchedUser.role }
  })

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)

  return NextResponse.json({
    success: true,
    role: matchedUser.role,
    roleName: roleData?.name || mapLegacyRole(matchedUser.role),
    displayName: matchedUser.display_name,
    isInternal: roleData?.is_internal ?? true
  })
}

/**
 * Handle Email+Password authentication
 */
async function handleEmailAuth(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  email: string,
  password: string,
  ipAddress: string,
  userAgent: string
): Promise<NextResponse> {
  // Find user by email with email_password auth method
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      password_hash,
      display_name,
      is_active,
      email_verified,
      auth_method,
      role_id,
      role,
      roles (
        id,
        name,
        display_name,
        is_internal
      )
    `)
    .eq('email', email.toLowerCase().trim())
    .eq('auth_method', 'email_password')
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
      { error: 'Ungültige Anmeldedaten' },
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
      { error: 'Passwort nicht gesetzt. Bitte Passwort zurücksetzen.' },
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
      { error: 'Ungültige Anmeldedaten' },
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

  // Get permissions
  const permissions = await getUserPermissions(supabase, user.role_id)

  // Create session
  const rolesData = user.roles as unknown
  const roleData = (Array.isArray(rolesData) ? rolesData[0] : rolesData) as { name: string; display_name: string; is_internal: boolean } | null
  const sessionToken = await createSession({
    userId: user.id,
    role: user.role as 'kewa' | 'imeri',
    roleId: user.role_id,
    roleName: roleData?.name || 'tenant',
    permissions
  })

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
    details: { role: roleData?.name }
  })

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)

  return NextResponse.json({
    success: true,
    role: user.role,
    roleName: roleData?.name || 'tenant',
    displayName: user.display_name,
    isInternal: roleData?.is_internal ?? false,
    emailVerified: user.email_verified
  })
}

/**
 * Get permissions for a role
 */
async function getUserPermissions(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  roleId: string | null
): Promise<string[]> {
  if (!roleId) return []

  const { data: permissions } = await supabase
    .from('role_permissions')
    .select('permissions(code)')
    .eq('role_id', roleId)

  if (!permissions) return []

  return permissions
    .map((p) => {
      const permData = p.permissions as unknown
      const perm = (Array.isArray(permData) ? permData[0] : permData) as { code: string } | null
      return perm?.code
    })
    .filter((code): code is string => !!code)
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
