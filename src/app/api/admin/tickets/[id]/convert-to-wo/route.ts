/**
 * Admin Ticket Conversion API
 *
 * POST /api/admin/tickets/[id]/convert-to-wo - Convert ticket to work order
 *
 * Operator must manually select work order type (no auto-mapping).
 * Phase 29: Tenant Extras & UX Improvements
 */

import { NextRequest, NextResponse } from 'next/server'
import { convertTicketToWorkOrder } from '@/lib/admin/ticket-to-work-order'
import type { UserRole } from '@/types'
import type { ConvertTicketInput } from '@/types/portal'

/**
 * POST /api/admin/tickets/[id]/convert-to-wo
 *
 * Convert a ticket to a work order.
 *
 * Required headers:
 * - x-user-id: Authenticated operator user ID
 * - x-user-role: Must be admin or property_manager
 *
 * Body:
 * - work_order_type: string (required - operator must select)
 * - partner_id: string (required)
 * - description?: string (optional - override ticket description)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as UserRole | null

  // Validate authentication
  if (!userId) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  // Validate role - must be admin or property_manager
  if (!userRole || !['admin', 'property_manager'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Keine Berechtigung für diese Aktion' },
      { status: 403 }
    )
  }

  try {
    const body = (await request.json()) as ConvertTicketInput

    // Validate required fields
    if (!body.work_order_type) {
      return NextResponse.json(
        { error: 'Arbeitsauftragstyp ist erforderlich' },
        { status: 400 }
      )
    }

    if (!body.partner_id) {
      return NextResponse.json(
        { error: 'Partner ist erforderlich' },
        { status: 400 }
      )
    }

    // UUID validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(body.partner_id)) {
      return NextResponse.json(
        { error: 'Ungültige Partner-ID' },
        { status: 400 }
      )
    }

    // Perform conversion
    const result = await convertTicketToWorkOrder({
      ticketId,
      operatorUserId: userId,
      workOrderType: body.work_order_type,
      partnerId: body.partner_id,
      description: body.description,
    })

    return NextResponse.json({
      success: true,
      workOrder: result.workOrder,
      ticket: result.ticket,
    })
  } catch (error) {
    console.error('Error converting ticket to work order:', error)

    const message = error instanceof Error ? error.message : 'Fehler bei der Umwandlung'

    // Check for specific error types
    if (message.includes('nicht gefunden')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('bereits') || message.includes('Nur offene')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
