/**
 * Invoice Approval API
 *
 * POST /api/invoices/[id]/approve - Approve an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDataAuditLog } from '@/lib/audit'
import { INVOICE_SELECT } from '@/lib/costs/invoice-queries'
import type { Role } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Roles allowed to approve invoices
 */
const APPROVAL_ROLES: Role[] = ['kewa']

/**
 * POST /api/invoices/[id]/approve - Approve an invoice
 *
 * Sets status to 'approved', approved_at = now, approved_by = user
 * Validates: must be in 'under_review' status
 * Role check: only kewa (admin/manager) can approve
 * Creates audit log entry
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

    // Check role authorization
    if (!APPROVAL_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Freigeben von Rechnungen' },
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

    const supabase = await createClient()

    // Check invoice exists and is in under_review status
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('id, status, invoice_number')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    if (existing.status !== 'under_review') {
      return NextResponse.json(
        { error: 'Rechnung muss im Status "In Pruefung" sein, um freigegeben zu werden' },
        { status: 400 }
      )
    }

    // Update invoice to approved
    const now = new Date().toISOString()
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: userId
      })
      .eq('id', id)
      .select(INVOICE_SELECT)
      .single()

    if (updateError) {
      console.error('Error approving invoice:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create audit log entry
    await createDataAuditLog(supabase, {
      tableName: 'invoices',
      recordId: id,
      action: 'update',
      userId,
      userRole,
      oldValues: { status: existing.status },
      newValues: { status: 'approved', approved_at: now, approved_by: userId }
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices/[id]/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
