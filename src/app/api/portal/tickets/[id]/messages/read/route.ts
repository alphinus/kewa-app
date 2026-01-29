/**
 * Portal Messages Read Receipt API
 *
 * POST /api/portal/tickets/:id/messages/read - Mark messages as read
 *
 * Explicitly marks all operator messages as read for a ticket.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { markMessagesAsRead } from '@/lib/portal/message-queries'

/**
 * POST /api/portal/tickets/:id/messages/read
 *
 * Mark all operator messages as read for a ticket.
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

    await markMessagesAsRead(userId, ticketId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking messages as read:', error)

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
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Markieren als gelesen',
      },
      { status: 500 }
    )
  }
}
