import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth'
import { createAuthAuditLog } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/magic-link/verify
 *
 * Verify a magic link token and create a session.
 * Used by external contractors to access their work orders.
 *
 * Request body:
 * {
 *   token: string (required - the magic link token)
 * }
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

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validate token using database function (also marks as used)
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_magic_link_token', { p_token: token })

    if (validationError) {
      console.error('Token validation error:', validationError)
      return NextResponse.json(
        { error: 'Token-Validierung fehlgeschlagen' },
        { status: 500 }
      )
    }

    // Result is an array with one row
    const result = validationResult?.[0]

    if (!result || !result.is_valid) {
      const errorAction = result?.error_message?.includes('expired')
        ? 'auth.login.magic_link.expired'
        : 'auth.login.magic_link.failure'

      await createAuthAuditLog(supabase, {
        action: errorAction,
        userId: null,
        ipAddress,
        userAgent,
        details: {
          token: token.substring(0, 8) + '...',
          error: result?.error_message || 'Token invalid'
        }
      })

      const errorMessages: Record<string, string> = {
        'Token not found': 'Link ungueltig oder nicht gefunden',
        'Token already used': 'Link wurde bereits verwendet',
        'Token revoked': 'Link wurde widerrufen',
        'Token expired': 'Link ist abgelaufen'
      }

      return NextResponse.json(
        { error: errorMessages[result?.error_message] || 'Ungültiger Link' },
        { status: 401 }
      )
    }

    // Token is valid - create or get contractor user
    let userId = result.user_id
    let userEmail = result.email

    // If no user_id on token, find or create contractor user
    if (!userId) {
      // Check if user exists with this email
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', result.email)
        .single()

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Get contractor role
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'external_contractor')
          .single()

        if (!role) {
          return NextResponse.json(
            { error: 'Rolle nicht gefunden' },
            { status: 500 }
          )
        }

        // Create contractor user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: result.email,
            display_name: result.email.split('@')[0], // Use email prefix as name
            role_id: role.id,
            role: 'imeri', // Legacy field
            auth_method: 'magic_link',
            is_active: true,
            pin_hash: '-' // Not used
          })
          .select('id')
          .single()

        if (createError || !newUser) {
          console.error('Failed to create contractor user:', createError)
          return NextResponse.json(
            { error: 'Benutzer konnte nicht erstellt werden' },
            { status: 500 }
          )
        }

        userId = newUser.id
      }
    }

    // Get permissions for contractor role
    const { data: roleData } = await supabase
      .from('users')
      .select(`
        role_id,
        roles (
          id,
          name,
          display_name
        )
      `)
      .eq('id', userId)
      .single()

    const permissions = roleData?.role_id
      ? await getPermissionsForRole(supabase, roleData.role_id)
      : ['work_orders:read', 'work_orders:respond']

    // Create session with work order context
    const rolesDataRaw = roleData?.roles as unknown
    const roleInfo = (Array.isArray(rolesDataRaw) ? rolesDataRaw[0] : rolesDataRaw) as { name: string } | null
    const sessionToken = await createSession({
      userId: userId,
      role: 'imeri', // Legacy role
      roleId: roleData?.role_id || null,
      roleName: roleInfo?.name || 'external_contractor',
      permissions
    })

    // Update login stats
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: 1 // Will be incremented on subsequent logins
      })
      .eq('id', userId)

    // Audit log successful magic link login
    await createAuthAuditLog(supabase, {
      action: 'auth.login.magic_link.success',
      userId,
      ipAddress,
      userAgent,
      details: {
        email: userEmail,
        workOrderId: result.work_order_id,
        purpose: result.purpose
      }
    })

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)

    // Return success with redirect info
    return NextResponse.json({
      success: true,
      workOrderId: result.work_order_id,
      redirectUrl: result.work_order_id
        ? `/contractor/work-order/${result.work_order_id}`
        : '/contractor'
    })
  } catch (error) {
    console.error('Magic link verify error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/magic-link/verify?token=xxx
 *
 * Convenience endpoint for direct link access.
 * Validates token and redirects to contractor portal.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  // Create a mock request with the token in the body
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ token })
  })

  // Call POST handler
  const response = await POST(mockRequest as NextRequest)
  const data = await response.json()

  if (!data.success) {
    const errorParam = encodeURIComponent(data.error || 'invalid_token')
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, request.url))
  }

  // Redirect to contractor portal
  return NextResponse.redirect(new URL(data.redirectUrl, request.url))
}

/**
 * Get permissions for a role
 */
async function getPermissionsForRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roleId: string
): Promise<string[]> {
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
