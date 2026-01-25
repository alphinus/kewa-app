/**
 * Purchase Orders API - Status Transition Route
 *
 * POST /api/purchase-orders/[id]/status - Transition purchase order status
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import {
  type PurchaseOrderStatus,
  canTransitionTo,
  getNextActions,
  getPurchaseOrderStatusLabel,
} from '@/lib/suppliers/status-utils'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can manage purchase orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Valid status values
const VALID_STATUSES: PurchaseOrderStatus[] = [
  'draft',
  'ordered',
  'confirmed',
  'delivered',
  'invoiced',
  'cancelled',
]

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
 * POST /api/purchase-orders/[id]/status - Transition status
 *
 * Body:
 * - status: PurchaseOrderStatus (required)
 *
 * Validates transition against allowed workflow:
 * - draft -> ordered | cancelled
 * - ordered -> confirmed | cancelled
 * - confirmed -> delivered | cancelled
 * - delivered -> invoiced
 * - invoiced, cancelled -> (terminal)
 */
export async function POST(
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

    // Only internal roles can update purchase order status
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

    // Validate status field
    if (!body.status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    const targetStatus = body.status as PurchaseOrderStatus

    // Validate status value
    if (!VALID_STATUSES.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current purchase order
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

    const currentStatus = existing.status as PurchaseOrderStatus

    // Check if transition is valid (client-side validation before database trigger)
    if (!canTransitionTo(currentStatus, targetStatus)) {
      const validNext = getNextActions(currentStatus)
      const validLabels = validNext.map(s => getPurchaseOrderStatusLabel(s)).join(', ')

      return NextResponse.json(
        {
          error: `Ungueltiger Statusuebergang: ${getPurchaseOrderStatusLabel(currentStatus)} -> ${getPurchaseOrderStatusLabel(targetStatus)}`,
          current_status: currentStatus,
          target_status: targetStatus,
          valid_transitions: validNext,
          message: validNext.length > 0
            ? `Erlaubte Uebergaenge: ${validLabels}`
            : 'Keine weiteren Statusaenderungen moeglich',
        },
        { status: 400 }
      )
    }

    // Update status (database trigger will set timestamp and re-validate)
    const { data: purchaseOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status: targetStatus })
      .eq('id', id)
      .select(PURCHASE_ORDER_SELECT)
      .single()

    if (updateError) {
      // Database trigger may throw error for invalid transitions
      console.error('Error updating purchase order status:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      purchase_order: purchaseOrder,
      message: `Status erfolgreich auf "${getPurchaseOrderStatusLabel(targetStatus)}" geaendert`,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/purchase-orders/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
