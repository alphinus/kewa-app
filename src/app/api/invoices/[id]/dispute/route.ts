/**
 * Invoice Dispute API
 *
 * POST /api/invoices/[id]/dispute - Dispute an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
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
 * Roles allowed to dispute invoices
 */
const DISPUTE_ROLES: Role[] = ['kewa']

interface DisputeBody {
  dispute_reason: string
}

/**
 * POST /api/invoices/[id]/dispute - Dispute an invoice
 *
 * Body: { dispute_reason: string }
 * Sets status to 'disputed' with dispute notes
 * Validates: must be in 'under_review' status
 * Role check: only kewa (admin/manager) can dispute
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
    if (!DISPUTE_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Beanstanden von Rechnungen' },
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

    // Parse and validate body
    const body: DisputeBody = await request.json()

    if (!body.dispute_reason || body.dispute_reason.trim() === '') {
      return NextResponse.json(
        { error: 'Beanstandungsgrund ist erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check invoice exists and is in under_review status
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('id, status, invoice_number, internal_notes')
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
        { error: 'Rechnung muss im Status "In Prüfung" sein, um beanstandet zu werden' },
        { status: 400 }
      )
    }

    // Append dispute reason to internal notes
    const now = new Date()
    const disputeNote = `[Beanstandet ${now.toLocaleDateString('de-CH')}]\n${body.dispute_reason.trim()}`
    const updatedNotes = existing.internal_notes
      ? `${existing.internal_notes}\n\n${disputeNote}`
      : disputeNote

    // Update invoice to disputed
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'disputed',
        internal_notes: updatedNotes
      })
      .eq('id', id)
      .select(INVOICE_SELECT)
      .single()

    if (updateError) {
      console.error('Error disputing invoice:', updateError)
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
      newValues: {
        status: 'disputed',
        dispute_reason: body.dispute_reason.trim()
      }
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices/[id]/dispute:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
