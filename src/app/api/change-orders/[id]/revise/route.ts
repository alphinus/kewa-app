/**
 * Change Orders API - Counter-Offer Revision Route
 *
 * POST /api/change-orders/[id]/revise - Create counter-offer revision
 *
 * Phase 21-02: Approval Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { ChangeOrderLineItem, ChangeOrderStatus } from '@/types/change-orders'
import { calculateLineItemsTotal, CHANGE_ORDER_SELECT } from '@/lib/change-orders/queries'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can create revisions
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Statuses that allow revisions
const REVISABLE_STATUSES: ChangeOrderStatus[] = ['under_review', 'submitted']

/**
 * POST /api/change-orders/[id]/revise - Create counter-offer revision
 *
 * Body:
 * - line_items: ChangeOrderLineItem[] (required)
 * - description?: string (optional description update)
 * - schedule_impact_days?: number (optional schedule update)
 * - revision_reason: string (required - why creating revision)
 *
 * Only allowed when status is 'under_review' or 'submitted'
 * Uses optimistic locking to prevent concurrent updates
 * Version trigger captures old values in change_order_versions
 * Resets status to 'submitted' for re-review
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

    // Only internal roles can create revisions
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

    // Validate required fields
    if (!body.line_items || !Array.isArray(body.line_items)) {
      return NextResponse.json(
        { error: 'line_items array is required' },
        { status: 400 }
      )
    }

    if (!body.revision_reason || typeof body.revision_reason !== 'string') {
      return NextResponse.json(
        { error: 'revision_reason is required' },
        { status: 400 }
      )
    }

    const lineItems = body.line_items as ChangeOrderLineItem[]
    const description = body.description as string | undefined
    const scheduleImpactDays = body.schedule_impact_days as number | undefined
    const revisionReason = body.revision_reason as string

    // Validate line items have required fields
    for (const item of lineItems) {
      if (!item.description || typeof item.quantity !== 'number' || typeof item.unit_price !== 'number') {
        return NextResponse.json(
          { error: 'Each line item must have description, quantity, and unit_price' },
          { status: 400 }
        )
      }
    }

    const supabase = await createOrgClient(request)

    // Get current change order with version for optimistic locking
    const { data: existing, error: checkError } = await supabase
      .from('change_orders')
      .select('id, co_number, status, version')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    const currentStatus = existing.status as ChangeOrderStatus

    // Check if current status allows revisions
    if (!REVISABLE_STATUSES.includes(currentStatus)) {
      return NextResponse.json(
        {
          error: `Cannot create revision in status "${currentStatus}". Revisions only allowed in: ${REVISABLE_STATUSES.join(', ')}`,
          current_status: currentStatus,
        },
        { status: 400 }
      )
    }

    // Calculate new total from line items
    const totalAmount = calculateLineItemsTotal(lineItems)

    // Prepare update data
    const updateData: {
      line_items: ChangeOrderLineItem[]
      total_amount: number
      version: number
      status: ChangeOrderStatus
      description?: string
      schedule_impact_days?: number
    } = {
      line_items: lineItems,
      total_amount: totalAmount,
      version: existing.version + 1, // Increment version
      status: 'submitted', // Reset to submitted for re-review
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (scheduleImpactDays !== undefined) {
      updateData.schedule_impact_days = scheduleImpactDays
    }

    // Update with optimistic locking (WHERE version = current)
    // This ensures we only update if version hasn't changed since we read it
    const { data: changeOrder, error: updateError, count } = await supabase
      .from('change_orders')
      .update(updateData)
      .eq('id', id)
      .eq('version', existing.version) // Optimistic lock - only update if version matches
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (updateError) {
      console.error('Error creating revision:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Check if update actually happened (optimistic lock failed if no rows affected)
    if (!changeOrder) {
      return NextResponse.json(
        {
          error: 'Version conflict: Change order was modified by another user. Please refresh and try again.',
        },
        { status: 409 } // Conflict
      )
    }

    // Note: Database trigger (update_change_order_version) automatically:
    // - Captures old values in change_order_versions when version increments
    // - Stores revised_by, revised_at, revision_reason would need to be added to trigger
    // For now, log the revision reason
    console.log(
      `CO ${existing.co_number} revised by ${userId}: ${revisionReason}`
    )

    return NextResponse.json({
      change_order: changeOrder,
      message: `Revision erfolgreich erstellt (Version ${updateData.version})`,
      revision_reason: revisionReason,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/change-orders/[id]/revise:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
