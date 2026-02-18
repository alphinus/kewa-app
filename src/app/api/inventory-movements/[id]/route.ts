/**
 * Inventory Movements API - Individual Routes
 *
 * GET /api/inventory-movements/[id] - Get single movement
 * PATCH /api/inventory-movements/[id] - Update movement
 * DELETE /api/inventory-movements/[id] - Delete movement
 *
 * Phase 20-02: Inventory Tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import { getPreviousReading, calculateConsumption } from '@/lib/suppliers/inventory-queries'

// Internal roles that can manage inventory
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Select query with joins
const MOVEMENT_SELECT = `
  *,
  property:properties!property_id (
    id,
    name
  ),
  delivery:deliveries!delivery_id (
    id,
    delivery_date
  )
`

/**
 * GET /api/inventory-movements/[id] - Get single movement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can view inventory
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const supabase = await createOrgClient(request)

    const { data: movement, error } = await supabase
      .from('inventory_movements')
      .select(MOVEMENT_SELECT)
      .eq('id', id)
      .single()

    if (error || !movement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 })
    }

    return NextResponse.json({ movement })
  } catch (error) {
    console.error('Unexpected error in GET /api/inventory-movements/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/inventory-movements/[id] - Update movement
 *
 * Allowed updates:
 * - movement_date
 * - tank_level
 * - tank_capacity
 * - notes
 *
 * If tank_level or movement_date changed, recalculate consumption fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can update inventory
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await request.json()
    const supabase = await createOrgClient(request)

    // Get current movement
    const { data: currentMovement, error: fetchError } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentMovement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 })
    }

    // Determine if we need to recalculate consumption
    const tankLevelChanged = body.tank_level !== undefined && body.tank_level !== currentMovement.tank_level
    const dateChanged = body.movement_date !== undefined && body.movement_date !== currentMovement.movement_date

    let updateData: Record<string, unknown> = {}

    // Add allowed fields
    if (body.movement_date !== undefined) {
      updateData.movement_date = body.movement_date
    }
    if (body.tank_level !== undefined) {
      updateData.tank_level = body.tank_level
    }
    if (body.tank_capacity !== undefined) {
      updateData.tank_capacity = body.tank_capacity
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null
    }

    // Recalculate consumption if tank_level or movement_date changed
    if (tankLevelChanged || dateChanged) {
      const previousReading = await getPreviousReading(
        supabase,
        currentMovement.property_id,
        body.movement_date ?? currentMovement.movement_date
      )

      const consumption = calculateConsumption(
        previousReading,
        body.tank_level ?? currentMovement.tank_level,
        body.movement_date ?? currentMovement.movement_date,
        currentMovement.movement_type
      )

      updateData.days_since_last = consumption.days_since_last
      updateData.consumption_amount = consumption.consumption_amount
      updateData.daily_usage_rate = consumption.daily_usage_rate
    }

    const { data: movement, error: updateError } = await supabase
      .from('inventory_movements')
      .update(updateData)
      .eq('id', id)
      .select(MOVEMENT_SELECT)
      .single()

    if (updateError) {
      console.error('Error updating inventory movement:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ movement })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/inventory-movements/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/inventory-movements/[id] - Delete movement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can delete inventory
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const supabase = await createOrgClient(request)

    const { error } = await supabase.from('inventory_movements').delete().eq('id', id)

    if (error) {
      console.error('Error deleting inventory movement:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/inventory-movements/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
