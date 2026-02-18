/**
 * Unit Rent API Route
 *
 * PATCH /api/units/[id]/rent
 * Update the rent_amount for a unit
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirement: RENT-01 - Mietzins pro Unit speicherbar
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface UpdateRentInput {
  rent_amount: number | null
}

interface UnitRentResponse {
  unit: {
    id: string
    name: string
    rent_amount: number | null
    rent_currency: string
  }
}

/**
 * PATCH /api/units/[id]/rent
 * Update unit rent_amount
 *
 * Body: { rent_amount: number | null }
 * Validates: positive number or null
 * Creates audit log entry
 * Role check: only kewa, admin, accounting can update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UnitRentResponse | { error: string }>> {
  try {
    const { id } = await params
    const supabase = await createOrgClient(request)

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa (internal) can update rent
    // Note: v2.0 will add more granular RBAC with admin, accounting roles
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Aendern des Mietzinses' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body: UpdateRentInput = await request.json()
    const { rent_amount } = body

    // Validate rent_amount
    if (rent_amount !== null) {
      if (typeof rent_amount !== 'number') {
        return NextResponse.json(
          { error: 'Mietzins muss eine Zahl sein' },
          { status: 400 }
        )
      }
      if (rent_amount < 0) {
        return NextResponse.json(
          { error: 'Mietzins kann nicht negativ sein' },
          { status: 400 }
        )
      }
    }

    // Get current unit data for audit log
    const { data: currentUnit, error: fetchError } = await supabase
      .from('units')
      .select('id, name, rent_amount, rent_currency')
      .eq('id', id)
      .single()

    if (fetchError || !currentUnit) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Einheit nicht gefunden' },
          { status: 404 }
        )
      }
      console.error('Error fetching unit:', fetchError)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Einheit' },
        { status: 500 }
      )
    }

    const oldRentAmount = currentUnit.rent_amount

    // Update unit rent_amount
    const { data: updatedUnit, error: updateError } = await supabase
      .from('units')
      .update({
        rent_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, rent_amount, rent_currency')
      .single()

    if (updateError) {
      console.error('Error updating unit rent:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern des Mietzinses' },
        { status: 500 }
      )
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        table_name: 'units',
        record_id: id,
        action: 'update',
        user_id: userId,
        user_role: userRole,
        old_values: { rent_amount: oldRentAmount },
        new_values: { rent_amount },
        changed_fields: ['rent_amount']
      })

    if (auditError) {
      // Log error but don't fail the request - audit is secondary
      console.error('Error creating audit log:', auditError)
    }

    return NextResponse.json({
      unit: {
        id: updatedUnit.id,
        name: updatedUnit.name,
        rent_amount: updatedUnit.rent_amount,
        rent_currency: updatedUnit.rent_currency
      }
    })
  } catch (error) {
    console.error('Error in PATCH /api/units/[id]/rent:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/units/[id]/rent
 * Get current rent amount for a unit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UnitRentResponse | { error: string }>> {
  try {
    const { id } = await params
    const supabase = await createOrgClient(request)

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa (internal) can view rent
    // Note: v2.0 will add more granular RBAC roles
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    const { data: unit, error } = await supabase
      .from('units')
      .select('id, name, rent_amount, rent_currency')
      .eq('id', id)
      .single()

    if (error || !unit) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Einheit nicht gefunden' },
          { status: 404 }
        )
      }
      console.error('Error fetching unit rent:', error)
      return NextResponse.json(
        { error: 'Fehler beim Laden' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      unit: {
        id: unit.id,
        name: unit.name,
        rent_amount: unit.rent_amount,
        rent_currency: unit.rent_currency
      }
    })
  } catch (error) {
    console.error('Error in GET /api/units/[id]/rent:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
