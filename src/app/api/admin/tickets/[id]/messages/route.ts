/**
 * Admin Ticket Messages API
 *
 * GET /api/admin/tickets/:id/messages - List messages for ticket
 * POST /api/admin/tickets/:id/messages - Send operator message
 *
 * Operator endpoint for viewing and sending messages with tenant notifications.
 * Phase 29: Tenant Extras & UX
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getTenantNotificationData,
  notifyTenantTicketReply,
} from '@/lib/notifications/tenant-triggers'
import type { Role } from '@/types'

// =============================================
// TYPES
// =============================================

interface RouteContext {
  params: Promise<{ id: string }>
}

interface CreateMessageBody {
  content: string
}

// =============================================
// GET - List messages
// =============================================

/**
 * GET /api/admin/tickets/:id/messages
 *
 * Get all messages for a ticket with sender details.
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
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only operators can view ticket messages (kewa = admin)
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
        { error: 'Ungültige Ticket-ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch messages with sender details and attachments
    const { data: messages, error: messagesError } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:users!ticket_messages_created_by_fkey (
          id,
          display_name
        ),
        attachments:ticket_attachments (
          id,
          ticket_id,
          message_id,
          uploaded_by,
          storage_path,
          file_name,
          file_size,
          mime_type,
          created_at
        )
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Nachrichten' },
        { status: 500 }
      )
    }

    // Mark tenant messages as read (operator viewing)
    await supabase
      .from('ticket_messages')
      .update({
        read_at: new Date().toISOString(),
        read_by: userId,
      })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'tenant')
      .is('read_at', null)

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/tickets/[id]/messages:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// =============================================
// POST - Send operator message
// =============================================

/**
 * POST /api/admin/tickets/:id/messages
 *
 * Send a message from operator to tenant.
 * Triggers tenant notification.
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
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only operators can send messages (kewa = admin)
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
        { error: 'Ungültige Ticket-ID' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: CreateMessageBody = await request.json()

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Nachricht darf nicht leer sein' },
        { status: 400 }
      )
    }

    if (body.content.length > 5000) {
      return NextResponse.json(
        { error: 'Nachricht zu lang (max. 5000 Zeichen)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify ticket exists and get its status
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, status, ticket_number')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      )
    }

    // Don't allow messages on closed/cancelled tickets
    if (ticket.status === 'geschlossen' || ticket.status === 'storniert') {
      return NextResponse.json(
        { error: 'Keine Nachrichten an geschlossene Tickets möglich' },
        { status: 400 }
      )
    }

    // Get operator display name for notification
    const { data: operatorUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .single()

    const operatorName = operatorUser?.display_name || 'KEWA Team'

    // Create message
    const { data: message, error: insertError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'operator',
        created_by: userId,
        content: body.content,
      })
      .select(`
        *,
        sender:users!ticket_messages_created_by_fkey (
          id,
          display_name
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating message:', insertError)
      return NextResponse.json(
        { error: 'Fehler beim Senden der Nachricht' },
        { status: 500 }
      )
    }

    // Update ticket's last_message_at
    await supabase
      .from('tickets')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', ticketId)

    // Fire tenant notification (non-blocking)
    getTenantNotificationData(ticketId)
      .then((notificationData) => {
        if (notificationData) {
          notifyTenantTicketReply({
            ticketId,
            ...notificationData,
            replyContent: body.content,
            operatorName,
          }).catch((err) => console.error('Reply notification failed:', err))
        }
      })
      .catch((err) => console.error('Failed to get notification data:', err))

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/tickets/[id]/messages:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
