/**
 * Deliveries API - Single Resource Routes
 *
 * GET /api/deliveries/[id] - Get delivery by ID
 * PATCH /api/deliveries/[id] - Update delivery
 * DELETE /api/deliveries/[id] - Delete delivery (only if no invoice linked)
 *
 * Phase 19-03: Delivery Recording with Property Association
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { UpdateDeliveryInput } from '@/types/suppliers'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can manage deliveries
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Select query with joins
const DELIVERY_SELECT = `
  *,
  purchase_order:purchase_orders!purchase_order_id (
    id,
    order_number,
    supplier_id,
    status,
    supplier:partners!supplier_id (
      id,
      company_name
    )
  ),
  property:properties!property_id (
    id,
    name
  ),
  building:buildings!building_id (
    id,
    name
  ),
  invoice:invoices!invoice_id (
    id,
    invoice_number
  )
`

/**
 * GET /api/deliveries/[id] - Get delivery by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can view deliveries
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid delivery ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select(DELIVERY_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Delivery not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching delivery:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ delivery })
  } catch (error) {
    console.error('Unexpected error in GET /api/deliveries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/deliveries/[id] - Update delivery
 *
 * Allowed updates:
 * - delivery_date
 * - delivery_note_number
 * - quantity_received (recalculates has_variance)
 * - variance_note
 * - notes
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can update deliveries
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid delivery ID format' },
        { status: 400 }
      )
    }

    const body: UpdateDeliveryInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check delivery exists and get current data
    const { data: existing, error: checkError } = await supabase
      .from('deliveries')
      .select('id, quantity_ordered, quantity_received, invoice_id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.delivery_date !== undefined) {
      updateData.delivery_date = body.delivery_date
    }

    if (body.delivery_note_number !== undefined) {
      updateData.delivery_note_number = body.delivery_note_number?.trim() || null
    }

    if (body.quantity_received !== undefined) {
      updateData.quantity_received = body.quantity_received
      // has_variance is a computed column, no need to set it manually
    }

    if (body.variance_note !== undefined) {
      updateData.variance_note = body.variance_note?.trim() || null
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update delivery
    const { data: delivery, error: updateError } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select(DELIVERY_SELECT)
      .single()

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ delivery })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/deliveries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/deliveries/[id] - Delete delivery
 *
 * Only allowed if no invoice is linked.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa (admin) can delete deliveries
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid delivery ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check delivery exists and has no invoice linked
    const { data: existing, error: checkError } = await supabase
      .from('deliveries')
      .select('id, invoice_id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Don't allow deletion if invoice is linked
    if (existing.invoice_id) {
      return NextResponse.json(
        { error: 'Lieferung kann nicht geloescht werden, da eine Rechnung verknuepft ist' },
        { status: 400 }
      )
    }

    // Delete delivery
    const { error: deleteError } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting delivery:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/deliveries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
