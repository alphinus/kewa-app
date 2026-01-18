/**
 * Expenses API - Collection Routes
 *
 * POST /api/expenses - Create a new expense
 * GET /api/expenses - List expenses (with filters)
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { CreateExpenseInput } from '@/types/database'
import { EXPENSE_SELECT, type ExpenseWithRelations } from '@/lib/costs/expense-queries'

// Internal roles that can manage expenses
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/expenses - List expenses
 *
 * Query params:
 * - project_id: Filter by renovation project
 * - unit_id: Filter by unit
 * - category: Filter by expense category
 * - date_from: Filter by minimum paid_at date (YYYY-MM-DD)
 * - date_to: Filter by maximum paid_at date (YYYY-MM-DD)
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

    // Only internal roles can view expenses
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const projectId = searchParams.get('project_id')
    const unitId = searchParams.get('unit_id')
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('expenses')
      .select(EXPENSE_SELECT, { count: 'exact' })
      .order('paid_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (projectId) {
      query = query.eq('renovation_project_id', projectId)
    }
    if (unitId) {
      query = query.eq('unit_id', unitId)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (dateFrom) {
      query = query.gte('paid_at', dateFrom)
    }
    if (dateTo) {
      // Add time to include full day
      query = query.lte('paid_at', `${dateTo}T23:59:59.999Z`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate totals for the filtered set
    const expenses = (data || []) as ExpenseWithRelations[]
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    return NextResponse.json({
      expenses,
      total: count,
      totalAmount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expenses - Create a new expense
 *
 * Body: CreateExpenseInput
 *
 * Validates:
 * - At least one entity link (project, work_order, unit, or room)
 * - Receipt storage path is required
 * - Category and payment_method are valid enums
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

    // Only internal roles can create expenses
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateExpenseInput = await request.json()

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    if (body.amount === undefined || body.amount === null || body.amount < 0) {
      return NextResponse.json(
        { error: 'amount must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'category is required' },
        { status: 400 }
      )
    }

    if (!body.payment_method) {
      return NextResponse.json(
        { error: 'payment_method is required' },
        { status: 400 }
      )
    }

    // Validate at least one entity link (database trigger also validates this)
    const hasEntityLink =
      body.renovation_project_id ||
      body.work_order_id ||
      body.unit_id ||
      body.room_id

    if (!hasEntityLink) {
      return NextResponse.json(
        { error: 'Expense must be linked to at least one entity (project, work_order, unit, or room)' },
        { status: 400 }
      )
    }

    // Validate receipt is required
    if (!body.receipt_storage_path) {
      return NextResponse.json(
        { error: 'receipt_storage_path is required - please upload a receipt' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create expense
    const { data: expense, error: createError } = await supabase
      .from('expenses')
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        category: body.category,
        amount: body.amount,
        payment_method: body.payment_method,
        renovation_project_id: body.renovation_project_id || null,
        work_order_id: body.work_order_id || null,
        unit_id: body.unit_id || null,
        room_id: body.room_id || null,
        vendor_name: body.vendor_name?.trim() || null,
        partner_id: body.partner_id || null,
        receipt_storage_path: body.receipt_storage_path,
        receipt_number: body.receipt_number?.trim() || null,
        trade_category: body.trade_category || null,
        notes: body.notes?.trim() || null,
        paid_by: userId, // Set to current user if not specified
        paid_at: new Date().toISOString(),
        created_by: userId,
      })
      .select(EXPENSE_SELECT)
      .single()

    if (createError) {
      console.error('Error creating expense:', createError)

      // Check for validation trigger error
      if (createError.message.includes('must be linked to at least one entity')) {
        return NextResponse.json(
          { error: 'Expense must be linked to at least one entity (project, work_order, unit, or room)' },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
