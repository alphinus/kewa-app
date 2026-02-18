/**
 * Single Expense API Routes
 *
 * GET /api/expenses/[id] - Get expense details
 * PATCH /api/expenses/[id] - Update expense
 * DELETE /api/expenses/[id] - Delete expense
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import { EXPENSE_SELECT } from '@/lib/costs/expense-queries'

// Internal roles that can manage expenses
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/expenses/[id] - Get single expense with relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only internal roles can view expenses
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = await createOrgClient(request)

    const { data, error } = await supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching expense:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expense: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/expenses/[id]:', error)
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
 * PATCH /api/expenses/[id] - Update expense fields
 *
 * Allowed fields:
 * - title, description, category, amount
 * - payment_method, vendor_name, receipt_number
 * - notes, trade_category
 * - renovation_project_id, work_order_id, unit_id, room_id
 *
 * Note: Cannot change receipt_storage_path via PATCH (upload new receipt instead)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only internal roles can update expenses
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createOrgClient(request)

    // Verify expense exists
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Build update object with only allowed fields
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json(
          { error: 'title cannot be empty' },
          { status: 400 }
        )
      }
      updateData.title = body.title.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.category !== undefined) {
      updateData.category = body.category
    }

    if (body.amount !== undefined) {
      if (body.amount < 0) {
        return NextResponse.json(
          { error: 'amount must be non-negative' },
          { status: 400 }
        )
      }
      updateData.amount = body.amount
    }

    if (body.payment_method !== undefined) {
      updateData.payment_method = body.payment_method
    }

    if (body.vendor_name !== undefined) {
      updateData.vendor_name = body.vendor_name?.trim() || null
    }

    if (body.receipt_number !== undefined) {
      updateData.receipt_number = body.receipt_number?.trim() || null
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null
    }

    if (body.trade_category !== undefined) {
      updateData.trade_category = body.trade_category || null
    }

    // Entity links - allow null to clear
    if (body.renovation_project_id !== undefined) {
      updateData.renovation_project_id = body.renovation_project_id || null
    }

    if (body.work_order_id !== undefined) {
      updateData.work_order_id = body.work_order_id || null
    }

    if (body.unit_id !== undefined) {
      updateData.unit_id = body.unit_id || null
    }

    if (body.room_id !== undefined) {
      updateData.room_id = body.room_id || null
    }

    // Allow receipt update
    if (body.receipt_storage_path !== undefined) {
      updateData.receipt_storage_path = body.receipt_storage_path || null
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update expense
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select(EXPENSE_SELECT)
      .single()

    if (error) {
      console.error('Error updating expense:', error)

      // Check for validation trigger error
      if (error.message.includes('must be linked to at least one entity')) {
        return NextResponse.json(
          { error: 'Expense must be linked to at least one entity (project, work_order, unit, or room)' },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expense: data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/expenses/[id]:', error)
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
 * DELETE /api/expenses/[id] - Delete expense
 *
 * Hard delete (no soft delete for expenses).
 * Note: Associated receipt file in storage should be cleaned up separately.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only kewa role can delete expenses (more restrictive)
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Forbidden: Only admin can delete expenses' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = await createOrgClient(request)

    // Verify expense exists and get receipt path for potential cleanup
    const { data: existing, error: fetchError } = await supabase
      .from('expenses')
      .select('id, receipt_storage_path')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting expense:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Note: Receipt file cleanup could be done here if needed
    // For now, orphaned files can be cleaned up via scheduled task

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/expenses/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
