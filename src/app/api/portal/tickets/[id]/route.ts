/**
 * Portal Single Ticket API
 *
 * GET /api/portal/tickets/:id - Get ticket details
 *
 * Tenant isolation via x-portal-user-id header and ownership verification.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTicketById } from '@/lib/portal/ticket-queries'

/**
 * GET /api/portal/tickets/:id
 *
 * Get a single ticket with full details.
 * Automatically verifies ticket ownership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const { id: ticketId } = await params

    const ticket = await getTicketById(userId, ticketId)

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error fetching ticket:', error)

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
      { error: error instanceof Error ? error.message : 'Fehler beim Laden des Tickets' },
      { status: 500 }
    )
  }
}
