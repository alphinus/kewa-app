/**
 * Change Orders API - Status Transition Route
 *
 * PATCH /api/change-orders/[id]/status - Transition change order status
 *
 * Phase 21-02: Approval Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { ChangeOrderStatus } from '@/types/change-orders'
import {
  canTransition,
  getNextActions,
  getStatusLabel,
} from '@/lib/change-orders/workflow'
import { determineApprover } from '@/lib/change-orders/threshold-routing'
import { CHANGE_ORDER_SELECT } from '@/lib/change-orders/queries'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can manage change orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Valid status values
const VALID_STATUSES: ChangeOrderStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
]

/**
 * PATCH /api/change-orders/[id]/status - Transition status
 *
 * Body:
 * - status: ChangeOrderStatus (required)
 * - comment?: string (required for 'rejected')
 * - cancelled_reason?: string (required for 'cancelled')
 *
 * Validates transition against allowed workflow:
 * - draft -> submitted | cancelled
 * - submitted -> under_review | cancelled
 * - under_review -> approved | rejected | submitted (counter-offer) | cancelled
 * - approved -> cancelled
 * - rejected, cancelled -> (terminal)
 *
 * On 'submitted': Determines approver via threshold routing
 * On 'approved': Verifies current user is approver
 * On 'rejected': Requires comment
 * On 'cancelled': Requires cancelled_reason
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

    // Only internal roles can update change order status
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
        { error: 'Invalid change order ID format' },
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

    const targetStatus = body.status as ChangeOrderStatus
    const comment = body.comment as string | undefined
    const cancelledReason = body.cancelled_reason as string | undefined

    // Validate status value
    if (!VALID_STATUSES.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate rejected requires comment
    if (targetStatus === 'rejected' && !comment) {
      return NextResponse.json(
        { error: 'comment is required when rejecting a change order' },
        { status: 400 }
      )
    }

    // Validate cancelled requires cancelled_reason
    if (targetStatus === 'cancelled' && !cancelledReason) {
      return NextResponse.json(
        { error: 'cancelled_reason is required when cancelling a change order' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Get current change order with work order for project lookup
    const { data: existing, error: checkError } = await supabase
      .from('change_orders')
      .select(`
        id,
        status,
        co_number,
        total_amount,
        current_approver_id,
        work_order:work_orders!work_order_id (
          id,
          project_id
        )
      `)
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    const currentStatus = existing.status as ChangeOrderStatus

    // Check if transition is valid (client-side validation before database trigger)
    if (!canTransition(currentStatus, targetStatus)) {
      const validNext = getNextActions(currentStatus)
      const validLabels = validNext.map(s => getStatusLabel(s)).join(', ')

      return NextResponse.json(
        {
          error: `Ungültiger Statusuebergang: ${getStatusLabel(currentStatus)} -> ${getStatusLabel(targetStatus)}`,
          current_status: currentStatus,
          target_status: targetStatus,
          valid_transitions: validNext,
          message: validNext.length > 0
            ? `Erlaubte Übergaenge: ${validLabels}`
            : 'Keine weiteren Statusänderungen möglich',
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: {
      status: ChangeOrderStatus
      current_approver_id?: string | null
      cancelled_reason?: string
    } = {
      status: targetStatus,
    }

    // Special handling for 'submitted' - determine approver via threshold routing
    if (targetStatus === 'submitted') {
      // work_order may be returned as array or single object depending on Supabase version
      const workOrderData = existing.work_order
      const workOrder = Array.isArray(workOrderData) ? workOrderData[0] : workOrderData
      const projectId = (workOrder as { id: string; project_id: string } | null)?.project_id ?? null

      const approvalRoute = await determineApprover(
        id,
        existing.total_amount,
        projectId,
        supabase
      )

      // For now, just set the role string. In a real system, you'd lookup user by role.
      // This is a simplified implementation - the actual user assignment would happen
      // via a separate endpoint or background job based on the approver_role.
      // For demo purposes, we'll set current_approver_id to null and store the role
      // in a hypothetical field (but since schema doesn't have it, just log it)
      console.log(
        `CO ${existing.co_number}: Threshold routing determined approver role: ${approvalRoute.approver_role}, requires client approval: ${approvalRoute.requires_client_approval}`
      )

      // Set current_approver_id to null for now (would be assigned by admin or auto-lookup)
      updateData.current_approver_id = null
    }

    // Special handling for 'approved' - verify current user is approver
    if (targetStatus === 'approved') {
      // Check if current user is the assigned approver (or has admin role)
      if (
        existing.current_approver_id &&
        existing.current_approver_id !== userId &&
        userRole !== 'kewa' // Allow kewa admins to override
      ) {
        return NextResponse.json(
          { error: 'Forbidden: Only the assigned approver can approve this change order' },
          { status: 403 }
        )
      }
    }

    // Add cancelled_reason if cancelling
    if (targetStatus === 'cancelled' && cancelledReason) {
      updateData.cancelled_reason = cancelledReason
    }

    // Update status (database trigger will set timestamps and re-validate)
    const { data: changeOrder, error: updateError } = await supabase
      .from('change_orders')
      .update(updateData)
      .eq('id', id)
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (updateError) {
      // Database trigger may throw error for invalid transitions
      console.error('Error updating change order status:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Create audit trail entry for rejection with comment
    if (targetStatus === 'rejected' && comment) {
      // Note: In a real system, you'd insert into an audit_log or comments table
      // For now, just log it
      console.log(
        `CO ${existing.co_number} rejected by ${userId} with comment: ${comment}`
      )
    }

    return NextResponse.json({
      change_order: changeOrder,
      message: `Status erfolgreich auf "${getStatusLabel(targetStatus)}" geaendert`,
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/change-orders/[id]/status:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
