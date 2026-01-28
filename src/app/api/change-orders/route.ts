/**
 * Change Orders API - Collection Routes
 *
 * GET /api/change-orders - List change orders with filters
 * POST /api/change-orders - Create a new change order
 *
 * Phase 21-01: Change Order CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { ChangeOrderStatus, CreateChangeOrderInput } from '@/types/change-orders'
import { calculateLineItemsTotal, CHANGE_ORDER_SELECT } from '@/lib/change-orders/queries'

// Internal roles that can manage change orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/change-orders - List change orders
 *
 * Query params:
 * - work_order_id: Filter by work order
 * - status: Filter by status
 * - project_id: Filter by project
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
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

    // Only internal roles can view change orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const workOrderId = searchParams.get('work_order_id')
    const status = searchParams.get('status') as ChangeOrderStatus | null
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('change_orders')
      .select(CHANGE_ORDER_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (workOrderId) {
      query = query.eq('work_order_id', workOrderId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (projectId) {
      // Filter by project via work_order join
      query = query.eq('work_orders.project_id', projectId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching change orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      change_orders: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/change-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/change-orders - Create a new change order
 *
 * Body: CreateChangeOrderInput
 * - work_order_id: UUID (required)
 * - description: string (required)
 * - reason_category: ChangeOrderReason (required)
 * - line_items: ChangeOrderLineItem[] (required, non-empty)
 * - reason_details?: string
 * - related_work_order_ids?: UUID[]
 * - schedule_impact_days?: number
 * - show_line_items_to_client?: boolean
 * - status?: 'draft' | 'submitted' (default: 'draft')
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

    // Only internal roles can create change orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateChangeOrderInput = await request.json()

    // Validate required fields
    if (!body.work_order_id) {
      return NextResponse.json(
        { error: 'work_order_id is required' },
        { status: 400 }
      )
    }

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      )
    }

    if (!body.reason_category) {
      return NextResponse.json(
        { error: 'reason_category is required' },
        { status: 400 }
      )
    }

    if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
      return NextResponse.json(
        { error: 'line_items is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify work order exists
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('id, title, wo_number')
      .eq('id', body.work_order_id)
      .single()

    if (woError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Calculate total from line items
    const totalAmount = calculateLineItemsTotal(body.line_items)

    // Generate CO number via RPC
    const { data: coNumber, error: rpcError } = await supabase
      .rpc('generate_change_order_number')

    if (rpcError) {
      console.error('Error generating CO number:', rpcError)
      return NextResponse.json(
        { error: 'Failed to generate CO number' },
        { status: 500 }
      )
    }

    // Determine initial status (default: draft)
    const status = body.status === 'submitted' ? 'submitted' : 'draft'

    // Build insert data
    const insertData = {
      co_number: coNumber,
      work_order_id: body.work_order_id,
      related_work_order_ids: body.related_work_order_ids ?? [],
      description: body.description.trim(),
      reason_category: body.reason_category,
      reason_details: body.reason_details?.trim() || null,
      line_items: body.line_items,
      total_amount: totalAmount,
      schedule_impact_days: body.schedule_impact_days ?? 0,
      status,
      creator_type: 'internal',
      show_line_items_to_client: body.show_line_items_to_client ?? true,
      created_by: userId,
      // Set submitted_at if creating with submitted status
      ...(status === 'submitted' && { submitted_at: new Date().toISOString() }),
    }

    const { data: changeOrder, error: createError } = await supabase
      .from('change_orders')
      .insert(insertData)
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (createError) {
      console.error('Error creating change order:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ change_order: changeOrder }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/change-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
