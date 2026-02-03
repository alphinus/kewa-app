/**
 * Admin Ticket Status API
 *
 * PATCH /api/admin/tickets/:id/status - Update ticket status
 *
 * Operator endpoint for changing ticket status with validation and tenant notifications.
 * Phase 29: Tenant Extras & UX
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getTenantNotificationData,
  notifyTenantTicketStatusChange,
} from '@/lib/notifications/tenant-triggers'
import type { TicketStatus, UpdateTicketStatusInput } from '@/types/portal'
import type { Role } from '@/types'

// =============================================
// TYPES
// =============================================

interface RouteContext {
  params: Promise<{ id: string }>
}

// Valid status transitions
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  offen: ['in_bearbeitung', 'geschlossen', 'storniert'],
  in_bearbeitung: ['geschlossen', 'storniert'],
  geschlossen: [], // No transitions from closed
  storniert: [], // No transitions from cancelled
}

// =============================================
// PATCH - Update ticket status
// =============================================

/**
 * PATCH /api/admin/tickets/:id/status
 *
 * Update ticket status with transition validation.
 * Triggers tenant notification on success.
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
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only operators can update ticket status (kewa = admin)
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    const { id: ticketId } = await context.params

    // Validate UUID format
    if (!ticketId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Ungueltige Ticket-ID' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: UpdateTicketStatusInput = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status erforderlich' },
        { status: 400 }
      )
    }

    const newStatus = body.status as TicketStatus

    // Validate status value
    const validStatuses: TicketStatus[] = ['offen', 'in_bearbeitung', 'geschlossen', 'storniert']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Ungueltiger Status' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current ticket
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('id, ticket_number, status, urgency')
      .eq('id', ticketId)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      )
    }

    const oldStatus = ticket.status as TicketStatus

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[oldStatus]
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { error: `Ungueltige Statusaenderung: ${oldStatus} -> ${newStatus}` },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    // Set closed_at and closed_by for closing
    if (newStatus === 'geschlossen') {
      updateData.closed_at = new Date().toISOString()
      updateData.closed_by = userId
    }

    // Set cancelled_at for cancellation
    if (newStatus === 'storniert') {
      updateData.cancelled_at = new Date().toISOString()
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket status:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren des Status' },
        { status: 500 }
      )
    }

    // Fire tenant notification (non-blocking)
    getTenantNotificationData(ticketId)
      .then((notificationData) => {
        if (notificationData) {
          notifyTenantTicketStatusChange({
            ticketId,
            ...notificationData,
            oldStatus,
            newStatus,
            ticketUrgency: ticket.urgency,
          }).catch((err) => console.error('Status notification failed:', err))
        }
      })
      .catch((err) => console.error('Failed to get notification data:', err))

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/tickets/[id]/status:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
