/**
 * Portal Ticket Cancel API
 *
 * POST /api/portal/tickets/:id/cancel - Cancel a ticket
 *
 * Tenant can only cancel tickets with status 'offen'.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { cancelTicket } from '@/lib/portal/ticket-queries'

/**
 * POST /api/portal/tickets/:id/cancel
 *
 * Cancel a ticket (only allowed when status is 'offen').
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const { id: ticketId } = await params

    const ticket = await cancelTicket(userId, ticketId)

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error cancelling ticket:', error)

    if (
      error instanceof Error &&
      error.message.includes('Nur offene Tickets')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (
      error instanceof Error &&
      error.message.includes('nicht gefunden')
    ) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden oder Zugriff verweigert' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Stornieren des Tickets' },
      { status: 500 }
    )
  }
}
