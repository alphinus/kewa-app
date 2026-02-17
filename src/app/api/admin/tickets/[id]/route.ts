/**
 * Admin Single Ticket API
 *
 * GET /api/admin/tickets/[id] - Get ticket with full details
 * PATCH /api/admin/tickets/[id] - Update ticket fields
 *
 * Phase 29: Tenant Extras & UX Improvements
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

/**
 * GET /api/admin/tickets/[id]
 *
 * Fetch a single ticket with full details for operator view.
 * Includes all messages with attachments, tenant details, unit/building info.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as UserRole | null

  if (!userId || !userRole) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  if (!['admin', 'property_manager'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Keine Berechtigung' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()

    // Fetch ticket with full details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        category:ticket_categories (
          id,
          name,
          display_name
        ),
        unit:units (
          id,
          name,
          building:buildings (
            id,
            name,
            address
          )
        ),
        tenant:users!tickets_created_by_fkey (
          id,
          display_name,
          email
        ),
        assigned_user:users!tickets_assigned_to_fkey (
          id,
          display_name
        )
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch all messages with attachments and sender details
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
    }

    // Fetch ticket-level attachments (not attached to a message)
    const { data: ticketAttachments } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('message_id', null)
      .order('created_at', { ascending: true })

    // Get message counts
    const { count: messageCount } = await supabase
      .from('ticket_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId)

    const { count: unreadCount } = await supabase
      .from('ticket_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'tenant')
      .is('read_at', null)

    return NextResponse.json({
      ticket: {
        ...ticket,
        message_count: messageCount || 0,
        unread_message_count: unreadCount || 0,
      },
      messages: messages || [],
      attachments: ticketAttachments || [],
    })
  } catch (error) {
    console.error('Error in GET /api/admin/tickets/[id]:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/tickets/[id]
 *
 * Update ticket fields (assigned_to, etc.).
 * Status changes are handled via separate endpoints.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as UserRole | null

  if (!userId || !userRole) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  if (!['admin', 'property_manager'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Keine Berechtigung' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const supabase = await createClient()

    // Allowed fields for update
    const allowedFields = ['assigned_to']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Aktualisieren' },
        { status: 400 }
      )
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error in PATCH /api/admin/tickets/[id]:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
