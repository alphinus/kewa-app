/**
 * Portal Profile API
 *
 * GET /api/portal/profile - Get tenant profile
 * PATCH /api/portal/profile - Update tenant profile
 *
 * Tenant can update phone and emergency contact.
 * Email is read-only (per CONTEXT.md - prevents auth complications).
 *
 * Phase 29: Tenant Extras & UX Improvements
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================
// TYPES
// =============================================

interface ProfileUpdateBody {
  phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

// Phone validation regex - allows numbers, spaces, plus, parentheses, hyphens
const PHONE_REGEX = /^[0-9+ ()-]+$/

// =============================================
// GET - Fetch profile
// =============================================

/**
 * GET /api/portal/profile
 *
 * Fetch tenant user profile including unit info.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createClient()

    // Fetch user with tenant_users relation for unit info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        display_name,
        phone,
        tenant_users!tenant_users_user_id_fkey (
          id,
          unit_id,
          is_primary,
          move_in_date,
          unit:units (
            id,
            name,
            building:buildings (
              id,
              name
            )
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Get emergency contact from a separate query if stored elsewhere
    // For now, we'll use fields that may need to be added to users table
    // The profile includes: id, email, display_name, phone, unit info

    // Get tenant_user record (first one)
    const tenantUser = Array.isArray(user.tenant_users)
      ? user.tenant_users[0]
      : user.tenant_users

    // Get unit info - handle both array and object forms
    let unitInfo = null
    if (tenantUser?.unit) {
      // Supabase may return array or object depending on query
      const unitData = Array.isArray(tenantUser.unit) ? tenantUser.unit[0] : tenantUser.unit
      if (unitData) {
        const building = Array.isArray(unitData.building) ? unitData.building[0] : unitData.building
        unitInfo = {
          id: unitData.id,
          name: unitData.name,
          building_name: building?.name || null,
        }
      }
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone || null,
        emergency_contact_name: null, // TODO: Add to users table if needed
        emergency_contact_phone: null, // TODO: Add to users table if needed
        unit: unitInfo,
      },
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Profils' },
      { status: 500 }
    )
  }
}

// =============================================
// PATCH - Update profile
// =============================================

/**
 * PATCH /api/portal/profile
 *
 * Update tenant profile fields.
 * Email is NOT editable (per CONTEXT.md).
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  try {
    const body = (await request.json()) as ProfileUpdateBody
    const supabase = await createClient()

    // Validate phone format if provided
    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      if (!PHONE_REGEX.test(body.phone)) {
        return NextResponse.json(
          { error: 'Ungültige Telefonnummer' },
          { status: 400 }
        )
      }
    }

    // Validate emergency phone format if provided
    if (
      body.emergency_contact_phone !== undefined &&
      body.emergency_contact_phone !== null &&
      body.emergency_contact_phone !== ''
    ) {
      if (!PHONE_REGEX.test(body.emergency_contact_phone)) {
        return NextResponse.json(
          { error: 'Ungültige Notfall-Telefonnummer' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, string | null> = {}

    if (body.phone !== undefined) {
      updateData.phone = body.phone || null
    }

    // Note: emergency_contact fields would need to be added to users table
    // For now, we only update phone

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Aktualisieren' },
        { status: 400 }
      )
    }

    // Update users table
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, display_name, phone')
      .single()

    if (updateError || !user) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern' },
        { status: 500 }
      )
    }

    // Refetch full profile with unit info
    const { data: fullUser } = await supabase
      .from('users')
      .select(`
        id,
        email,
        display_name,
        phone,
        tenant_users!tenant_users_user_id_fkey (
          unit:units (
            id,
            name,
            building:buildings (
              id,
              name
            )
          )
        )
      `)
      .eq('id', userId)
      .single()

    const tenantUser = Array.isArray(fullUser?.tenant_users)
      ? fullUser?.tenant_users[0]
      : fullUser?.tenant_users

    let unitInfo = null
    if (tenantUser?.unit) {
      // Supabase may return array or object depending on query
      const unitData = Array.isArray(tenantUser.unit) ? tenantUser.unit[0] : tenantUser.unit
      if (unitData) {
        const building = Array.isArray(unitData.building) ? unitData.building[0] : unitData.building
        unitInfo = {
          id: unitData.id,
          name: unitData.name,
          building_name: building?.name || null,
        }
      }
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone || null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        unit: unitInfo,
      },
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Fehler beim Speichern' },
      { status: 500 }
    )
  }
}
