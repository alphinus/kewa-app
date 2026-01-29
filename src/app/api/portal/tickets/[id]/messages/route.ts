/**
 * Portal Ticket Messages API
 *
 * GET /api/portal/tickets/:id/messages - List all messages for ticket
 * POST /api/portal/tickets/:id/messages - Send a new message
 *
 * Automatically marks operator messages as read when viewing.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getTicketMessages,
  createMessage,
  markMessagesAsRead,
} from '@/lib/portal/message-queries'
import type { CreateMessageInput } from '@/types/portal'

/**
 * GET /api/portal/tickets/:id/messages
 *
 * Get all messages for a ticket.
 * Also marks operator messages as read.
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

    // Fetch messages
    const messages = await getTicketMessages(userId, ticketId)

    // Mark operator messages as read
    await markMessagesAsRead(userId, ticketId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)

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
            : 'Fehler beim Laden der Nachrichten',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portal/tickets/:id/messages
 *
 * Send a new message (from tenant).
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
    const body = await request.json()
    const { content } = body as CreateMessageInput

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Nachricht darf nicht leer sein' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Nachricht zu lang (max. 5000 Zeichen)' },
        { status: 400 }
      )
    }

    await createMessage(userId, ticketId, { content })

    // Fetch updated messages to return
    const messages = await getTicketMessages(userId, ticketId)

    return NextResponse.json({ message: messages[messages.length - 1] }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)

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
            : 'Fehler beim Senden der Nachricht',
      },
      { status: 500 }
    )
  }
}
