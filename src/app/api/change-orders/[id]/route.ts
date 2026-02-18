/**
 * Change Orders API - Single Resource Routes
 *
 * GET /api/change-orders/[id] - Get change order detail with versions
 * PATCH /api/change-orders/[id] - Update a change order
 * DELETE /api/change-orders/[id] - Soft-delete (cancel) a change order
 *
 * Phase 21-01: Change Order CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { UpdateChangeOrderInput } from '@/types/change-orders'
import { calculateLineItemsTotal, CHANGE_ORDER_SELECT } from '@/lib/change-orders/queries'
import { canTransition } from '@/lib/change-orders/workflow'
import { notifyApprovalNeeded } from '@/lib/notifications/triggers'

// Internal roles that can manage change orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/change-orders/[id] - Get change order detail
 *
 * Returns:
 * - change_order: Full CO with joined work_order and project
 * - versions: Version history (all revisions)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can view change orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createOrgClient(request)

    // Fetch change order
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select(CHANGE_ORDER_SELECT)
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Fetch version history
    const { data: versions, error: versionsError } = await supabase
      .from('change_order_versions')
      .select('*')
      .eq('change_order_id', id)
      .order('version', { ascending: false })

    if (versionsError) {
      console.error('Error fetching versions:', versionsError)
      // Don't fail request if versions fail, just return empty array
    }

    return NextResponse.json({
      change_order: changeOrder,
      versions: versions ?? [],
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/change-orders/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/change-orders/[id] - Update a change order
 *
 * Body: UpdateChangeOrderInput
 * - description?: string
 * - reason_category?: ChangeOrderReason
 * - reason_details?: string | null
 * - line_items?: ChangeOrderLineItem[]
 * - schedule_impact_days?: number
 * - show_line_items_to_client?: boolean
 * - status?: ChangeOrderStatus
 * - cancelled_reason?: string (required if status='cancelled')
 *
 * Restrictions:
 * - Only allow updates when status is 'draft'
 * - If changing line_items, recalculate total_amount
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can update change orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateChangeOrderInput = await request.json()
    const supabase = await createOrgClient(request)

    // Fetch current change order
    const { data: current, error: fetchError } = await supabase
      .from('change_orders')
      .select('id, status, version')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Only allow updates when status is 'draft' (or status change to valid transitions)
    if (current.status !== 'draft' && !body.status) {
      return NextResponse.json(
        { error: 'Can only update change orders in draft status' },
        { status: 400 }
      )
    }

    // If changing status, validate transition
    if (body.status && body.status !== current.status) {
      if (!canTransition(current.status, body.status)) {
        return NextResponse.json(
          { error: `Invalid status transition: ${current.status} -> ${body.status}` },
          { status: 400 }
        )
      }

      // If transitioning to cancelled, require reason
      if (body.status === 'cancelled' && !body.cancelled_reason?.trim()) {
        return NextResponse.json(
          { error: 'cancelled_reason is required when cancelling' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.description !== undefined) {
      updateData.description = body.description.trim()
    }
    if (body.reason_category !== undefined) {
      updateData.reason_category = body.reason_category
    }
    if (body.reason_details !== undefined) {
      updateData.reason_details = body.reason_details?.trim() || null
    }
    if (body.schedule_impact_days !== undefined) {
      updateData.schedule_impact_days = body.schedule_impact_days
    }
    if (body.show_line_items_to_client !== undefined) {
      updateData.show_line_items_to_client = body.show_line_items_to_client
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.cancelled_reason !== undefined) {
      updateData.cancelled_reason = body.cancelled_reason.trim()
    }

    // Recalculate total if line_items changed
    if (body.line_items) {
      updateData.line_items = body.line_items
      updateData.total_amount = calculateLineItemsTotal(body.line_items)
    }

    const { data: changeOrder, error: updateError } = await supabase
      .from('change_orders')
      .update(updateData)
      .eq('id', id)
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (updateError) {
      console.error('Error updating change order:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fire notification when change order is submitted (approval needed)
    if (body.status === 'submitted') {
      notifyApprovalNeeded(
        'change_order',
        changeOrder.id,
        changeOrder.co_number,
        userId
      ).catch(err => console.error('Notification error:', err))
    }

    return NextResponse.json({ change_order: changeOrder })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/change-orders/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/change-orders/[id] - Soft-delete (cancel) a change order
 *
 * Body:
 * - cancelled_reason: string (required)
 *
 * Sets status to 'cancelled' with mandatory reason.
 * Only allowed if current status permits transition to 'cancelled'.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can delete change orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Require cancellation reason
    if (!body.cancelled_reason || body.cancelled_reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'cancelled_reason is required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Fetch current change order
    const { data: current, error: fetchError } = await supabase
      .from('change_orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Check if transition to cancelled is valid
    if (!canTransition(current.status, 'cancelled')) {
      return NextResponse.json(
        { error: `Cannot cancel change order with status: ${current.status}` },
        { status: 400 }
      )
    }

    // Update to cancelled status
    const { data: changeOrder, error: updateError } = await supabase
      .from('change_orders')
      .update({
        status: 'cancelled',
        cancelled_reason: body.cancelled_reason.trim(),
      })
      .eq('id', id)
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (updateError) {
      console.error('Error cancelling change order:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ change_order: changeOrder })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/change-orders/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
