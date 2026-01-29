/**
 * Work Orders API - Single Resource Routes
 *
 * GET /api/work-orders/[id] - Get work order with relations
 * PATCH /api/work-orders/[id] - Update work order
 * DELETE /api/work-orders/[id] - Delete work order (draft only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { UpdateWorkOrderInput } from '@/types/work-order'
import { notifyWorkOrderStatusChange } from '@/lib/notifications/triggers'

// Select query for work orders with relations
const WORK_ORDER_SELECT = `
  *,
  room:rooms (
    id,
    name,
    room_type,
    unit:units (
      id,
      name,
      building:buildings (
        id,
        name,
        address
      )
    )
  ),
  partner:partners (
    id,
    company_name,
    contact_name,
    email,
    phone,
    trades
  ),
  project:renovation_projects (
    id,
    name,
    description,
    status
  ),
  task:tasks (
    id,
    title,
    description,
    priority,
    trade_category
  )
`

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/work-orders/[id] - Get work order with relations
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

    const { id } = await context.params

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select(WORK_ORDER_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Work order not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching work order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ workOrder })
  } catch (error) {
    console.error('Unexpected error in GET /api/work-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/work-orders/[id] - Update work order
 *
 * Body: UpdateWorkOrderInput
 *
 * Status changes validated by database trigger.
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

    const { id } = await context.params

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    const body: UpdateWorkOrderInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check work order exists
    const { data: existing, error: checkError } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.scope_of_work !== undefined) updateData.scope_of_work = body.scope_of_work
    if (body.status !== undefined) updateData.status = body.status
    if (body.requested_start_date !== undefined) updateData.requested_start_date = body.requested_start_date
    if (body.requested_end_date !== undefined) updateData.requested_end_date = body.requested_end_date
    if (body.proposed_start_date !== undefined) updateData.proposed_start_date = body.proposed_start_date
    if (body.proposed_end_date !== undefined) updateData.proposed_end_date = body.proposed_end_date
    if (body.actual_start_date !== undefined) updateData.actual_start_date = body.actual_start_date
    if (body.actual_end_date !== undefined) updateData.actual_end_date = body.actual_end_date
    if (body.estimated_cost !== undefined) updateData.estimated_cost = body.estimated_cost
    if (body.proposed_cost !== undefined) updateData.proposed_cost = body.proposed_cost
    if (body.final_cost !== undefined) updateData.final_cost = body.final_cost
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes
    if (body.contractor_notes !== undefined) updateData.contractor_notes = body.contractor_notes
    if (body.rejection_reason !== undefined) updateData.rejection_reason = body.rejection_reason
    if (body.acceptance_deadline !== undefined) updateData.acceptance_deadline = body.acceptance_deadline

    // Update work order
    const { data: workOrder, error: updateError } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', id)
      .select(WORK_ORDER_SELECT)
      .single()

    if (updateError) {
      // Check for status transition error
      if (updateError.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }
      console.error('Error updating work order:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fire notification for status changes (non-blocking)
    const notifiableStatuses = ['sent', 'accepted', 'rejected']
    if (body.status && notifiableStatuses.includes(body.status)) {
      notifyWorkOrderStatusChange(
        workOrder.id,
        workOrder.wo_number,
        body.status,
        userId
      ).catch(err => console.error('Notification error:', err))
    }

    return NextResponse.json({ workOrder })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/work-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/work-orders/[id] - Delete work order
 *
 * Only draft work orders can be deleted.
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

    // Only kewa (admin) can delete work orders
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check work order exists and is draft
    const { data: existing, error: checkError } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft work orders can be deleted' },
        { status: 400 }
      )
    }

    // Delete work order
    const { error: deleteError } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting work order:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/work-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
