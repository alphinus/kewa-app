import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hashPassword, getSessionFromRequest } from '@/lib/auth'
import { createAuthAuditLog, createDataAuditLog } from '@/lib/audit'

/**
 * POST /api/auth/register
 *
 * Create a new user with email+password authentication.
 * Only admin and property_manager roles can create users.
 *
 * Request body:
 * {
 *   email: string (required)
 *   password: string (required, min 8 chars)
 *   displayName: string (required)
 *   roleName: 'tenant' | 'external_contractor' | 'accounting' (required)
 *   unitId?: string (required for tenants)
 * }
 */
export async function POST(request: NextRequest) {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    // Verify admin/manager session
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only admin and property_manager can create users
    if (session.role !== 'kewa' && session.role !== 'imeri') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, displayName, roleName, unitId } = body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email ist erforderlich' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json(
        { error: 'Anzeigename ist erforderlich' },
        { status: 400 }
      )
    }

    const allowedRoles = ['tenant', 'external_contractor', 'accounting']
    if (!roleName || !allowedRoles.includes(roleName)) {
      return NextResponse.json(
        { error: `Rolle muss eine von: ${allowedRoles.join(', ')} sein` },
        { status: 400 }
      )
    }

    // Tenants must have a unit assigned
    if (roleName === 'tenant' && !unitId) {
      return NextResponse.json(
        { error: 'Wohnungseinheit ist fuer Mieter erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email bereits registriert' },
        { status: 409 }
      )
    }

    // Get role ID
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Rolle nicht gefunden' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Determine legacy role field (for backward compat)
    // Tenants and contractors don't map to legacy roles, use 'imeri' as closest
    const legacyRole = roleName === 'accounting' ? 'kewa' : 'imeri'

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        display_name: displayName,
        role_id: role.id,
        role: legacyRole, // Legacy field
        auth_method: 'email_password',
        email_verified: false,
        is_active: true,
        pin_hash: '-' // Not used for email auth
      })
      .select('id, email, display_name')
      .single()

    if (createError || !newUser) {
      console.error('Failed to create user:', createError)
      return NextResponse.json(
        { error: 'Benutzer konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    // If tenant, create tenant_users link
    if (roleName === 'tenant' && unitId) {
      const { error: tenantError } = await supabase
        .from('tenant_users')
        .insert({
          user_id: newUser.id,
          unit_id: unitId,
          is_primary: true,
          move_in_date: new Date().toISOString().split('T')[0]
        })

      if (tenantError) {
        console.error('Failed to link tenant to unit:', tenantError)
        // Don't fail the whole operation, just log
      }
    }

    // Audit log
    await createDataAuditLog(supabase, {
      tableName: 'users',
      recordId: newUser.id,
      action: 'create',
      userId: session.userId,
      userRole: session.role,
      newValues: {
        email: newUser.email,
        display_name: newUser.display_name,
        role: roleName,
        created_by: session.userId
      },
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: roleName
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
