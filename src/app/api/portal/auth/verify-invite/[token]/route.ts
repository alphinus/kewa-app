import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/portal/invite-tokens'

/**
 * GET /api/portal/auth/verify-invite/[token]
 *
 * Verify invite token and return tenant info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Verify invite token
    const inviteData = await verifyInviteToken(token)
    if (!inviteData) {
      return NextResponse.json({
        valid: false,
        error: 'Token ungueltig oder abgelaufen'
      })
    }

    const supabase = await createClient()

    // Look up tenant user
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('id, user_id')
      .eq('id', inviteData.tenantUserId)
      .single()

    if (tenantError || !tenantUser) {
      return NextResponse.json({
        valid: false,
        error: 'Mieterregistrierung nicht gefunden'
      })
    }

    // Check if user already registered
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password_hash, display_name')
      .eq('id', tenantUser.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        valid: false,
        error: 'Benutzer nicht gefunden'
      })
    }

    if (user.password_hash) {
      return NextResponse.json({
        valid: false,
        error: 'Bereits registriert'
      })
    }

    // Token is valid and user not yet registered
    return NextResponse.json({
      valid: true,
      email: inviteData.email,
      displayName: user.display_name
    })
  } catch (error) {
    console.error('Invite verification error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Ein Fehler ist aufgetreten'
    })
  }
}
