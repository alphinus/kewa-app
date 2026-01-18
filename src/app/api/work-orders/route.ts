/**
 * Work Orders API - Collection Routes
 *
 * POST /api/work-orders - Create a new work order
 * GET /api/work-orders - List work orders (with filters)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { CreateWorkOrderInput } from '@/types/work-order'

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

/**
 * GET /api/work-orders - List work orders
 *
 * Query params:
 * - status: Filter by status (comma-separated for multiple)
 * - partner_id: Filter by partner
 * - project_id: Filter by renovation project
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
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

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const status = searchParams.get('status')
    const partnerId = searchParams.get('partner_id')
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('work_orders')
      .select(WORK_ORDER_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }
    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }
    if (projectId) {
      query = query.eq('renovation_project_id', projectId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching work orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      workOrders: data,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/work-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/work-orders - Create a new work order
 *
 * Body: CreateWorkOrderInput
 *
 * Creates work order with status 'draft'.
 * Must be sent separately via /api/work-orders/[id]/send endpoint.
 */
export async function POST(request: NextRequest) {
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

    const body: CreateWorkOrderInput = await request.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }
    if (!body.partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      )
    }

    // Validate at least project or task is provided
    if (!body.renovation_project_id && !body.task_id) {
      return NextResponse.json(
        { error: 'Either renovation_project_id or task_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify partner exists
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, email')
      .eq('id', body.partner_id)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // If task_id provided, get room_id and project_id from task
    let roomId = body.room_id
    let projectId = body.renovation_project_id

    if (body.task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, room_id, project_id, title')
        .eq('id', body.task_id)
        .single()

      if (taskError || !task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      // Use task's room if not provided
      if (!roomId && task.room_id) {
        roomId = task.room_id
      }
      // Use task's project if not provided
      if (!projectId && task.project_id) {
        projectId = task.project_id
      }
    }

    // Calculate default acceptance deadline (72 hours from now)
    let acceptanceDeadline = body.acceptance_deadline
    if (!acceptanceDeadline) {
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + 72)
      acceptanceDeadline = deadline.toISOString()
    }

    // Create work order
    const { data: workOrder, error: createError } = await supabase
      .from('work_orders')
      .insert({
        title: body.title,
        description: body.description,
        scope_of_work: body.scope_of_work,
        partner_id: body.partner_id,
        renovation_project_id: projectId,
        task_id: body.task_id,
        room_id: roomId,
        requested_start_date: body.requested_start_date,
        requested_end_date: body.requested_end_date,
        estimated_cost: body.estimated_cost,
        acceptance_deadline: acceptanceDeadline,
        internal_notes: body.internal_notes,
        status: 'draft',
        created_by: userId
      })
      .select(WORK_ORDER_SELECT)
      .single()

    if (createError) {
      console.error('Error creating work order:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/work-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
