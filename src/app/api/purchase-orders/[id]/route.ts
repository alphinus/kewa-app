/**
 * Purchase Orders API - Single Resource Routes
 *
 * GET /api/purchase-orders/[id] - Get purchase order by ID
 * PATCH /api/purchase-orders/[id] - Update purchase order fields
 * DELETE /api/purchase-orders/[id] - Delete purchase order (draft only)
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { calculateLineItemsTotal, type PurchaseOrderLineItem } from '@/lib/suppliers/purchase-order-queries'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can manage purchase orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Select query with supplier join
const PURCHASE_ORDER_SELECT = `
  *,
  supplier:partners!supplier_id (
    id,
    company_name,
    contact_name,
    email,
    phone
  )
`

/**
 * GET /api/purchase-orders/[id] - Get purchase order by ID
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

    // Only internal roles can view purchase orders
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
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select(PURCHASE_ORDER_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase order not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching purchase order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ purchase_order: purchaseOrder })
  } catch (error) {
    console.error('Unexpected error in GET /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/purchase-orders/[id] - Update purchase order
 *
 * Allowed updates (NOT status - use /status endpoint):
 * - line_items: Recalculates total_amount
 * - expected_delivery_date
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

    // Only internal roles can update purchase orders
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
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Don't allow status update via this endpoint
    if (body.status !== undefined) {
      return NextResponse.json(
        { error: 'Use POST /api/purchase-orders/[id]/status to update status' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check purchase order exists
    const { data: existing, error: checkError } = await supabase
      .from('purchase_orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.line_items !== undefined) {
      if (!Array.isArray(body.line_items) || body.line_items.length === 0) {
        return NextResponse.json(
          { error: 'line_items must be a non-empty array' },
          { status: 400 }
        )
      }
      const lineItems: PurchaseOrderLineItem[] = body.line_items
      updateData.line_items = lineItems
      updateData.total_amount = calculateLineItemsTotal(lineItems)
    }

    if (body.expected_delivery_date !== undefined) {
      updateData.expected_delivery_date = body.expected_delivery_date || null
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

    // Update purchase order
    const { data: purchaseOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .select(PURCHASE_ORDER_SELECT)
      .single()

    if (updateError) {
      console.error('Error updating purchase order:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ purchase_order: purchaseOrder })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/purchase-orders/[id] - Delete purchase order
 *
 * Only allowed if status is 'draft'.
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

    // Only kewa (admin) can delete purchase orders
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
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check purchase order exists and is in draft status
    const { data: existing, error: checkError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_number')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft orders
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Nur Bestellungen im Entwurf-Status können gelöscht werden' },
        { status: 400 }
      )
    }

    // Delete purchase order
    const { error: deleteError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting purchase order:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/purchase-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
