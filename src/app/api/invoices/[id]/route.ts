/**
 * Invoices API - Single Resource Routes
 *
 * GET /api/invoices/[id] - Get invoice with relations
 * PATCH /api/invoices/[id] - Update invoice fields
 * DELETE /api/invoices/[id] - Delete invoice (received only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { INVOICE_SELECT } from '@/lib/costs/invoice-queries'
import type { Role } from '@/types'
import { notifyApprovalNeeded } from '@/lib/notifications/triggers'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/invoices/[id] - Get invoice with all relations
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
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching invoice:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Unexpected error in GET /api/invoices/[id]:', error)
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
 * Allowed fields for PATCH update
 */
interface UpdateInvoiceInput {
  internal_notes?: string | null
  status?: 'under_review'
  variance_reason?: string | null
}

/**
 * PATCH /api/invoices/[id] - Update invoice fields
 *
 * Allowed updates:
 * - internal_notes: Internal notes for KEWA staff
 * - status: Can only set to 'under_review' from 'received'
 * - variance_reason: Explanation for variance
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
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      )
    }

    const body: UpdateInvoiceInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check invoice exists and get current status
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Build update object (only include allowed fields)
    const updateData: Record<string, unknown> = {}

    if (body.internal_notes !== undefined) {
      updateData.internal_notes = body.internal_notes
    }

    if (body.variance_reason !== undefined) {
      updateData.variance_reason = body.variance_reason
    }

    // Status change to under_review only allowed from received
    if (body.status === 'under_review') {
      if (existing.status !== 'received') {
        return NextResponse.json(
          { error: 'Can only move to under_review from received status' },
          { status: 400 }
        )
      }
      updateData.status = 'under_review'
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update invoice
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(INVOICE_SELECT)
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fire notification when invoice moves to under_review (approval needed)
    if (body.status === 'under_review') {
      notifyApprovalNeeded(
        'invoice',
        invoice.id,
        invoice.invoice_number || invoice.id,
        userId
      ).catch(err => console.error('Notification error:', err))
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/invoices/[id]:', error)
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
 * DELETE /api/invoices/[id] - Delete invoice
 *
 * Only received invoices can be deleted.
 * Admin role required.
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

    // Only kewa (admin) can delete invoices
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
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check invoice exists and is in received status
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'received') {
      return NextResponse.json(
        { error: 'Only received invoices can be deleted' },
        { status: 400 }
      )
    }

    // Delete invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/invoices/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
