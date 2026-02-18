/**
 * Message Query Helpers
 *
 * Server-side query helpers for ticket messages and read receipts.
 * All queries enforce ticket ownership verification.
 *
 * Phase 26: Tenant Portal Core
 */

import { createServiceClient } from '@/lib/supabase/with-org'
import { verifyTicketOwnership } from './tenant-isolation'
import type {
  TicketMessageWithAttachments,
  CreateMessageInput,
} from '@/types/portal'

// =============================================
// MESSAGE QUERIES
// =============================================

/**
 * Get all messages for a ticket with sender details and attachments
 *
 * @throws Error if ticket not owned by user
 */
export async function getTicketMessages(
  userId: string,
  ticketId: string
): Promise<TicketMessageWithAttachments[]> {
  // Verify ownership first
  await verifyTicketOwnership(userId, ticketId)

  const supabase = createServiceClient()

  const { data: messages, error } = await supabase
    .from('ticket_messages')
    .select(
      `
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
    `
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Fehler beim Laden der Nachrichten: ${error.message}`)
  }

  return (messages || []) as TicketMessageWithAttachments[]
}

/**
 * Create a new message (from tenant)
 *
 * @throws Error if ticket not owned by user
 */
export async function createMessage(
  userId: string,
  ticketId: string,
  input: CreateMessageInput
): Promise<void> {
  // Verify ownership first
  await verifyTicketOwnership(userId, ticketId)

  const supabase = createServiceClient()

  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_type: 'tenant',
    created_by: userId,
    content: input.content,
  })

  if (error) {
    throw new Error(`Fehler beim Senden der Nachricht: ${error.message}`)
  }
}

/**
 * Mark all operator messages as read for a ticket
 *
 * @throws Error if ticket not owned by user
 */
export async function markMessagesAsRead(userId: string, ticketId: string): Promise<void> {
  // Verify ownership first
  await verifyTicketOwnership(userId, ticketId)

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('ticket_messages')
    .update({
      read_at: new Date().toISOString(),
      read_by: userId,
    })
    .eq('ticket_id', ticketId)
    .eq('sender_type', 'operator')
    .is('read_at', null)

  if (error) {
    throw new Error(`Fehler beim Markieren als gelesen: ${error.message}`)
  }
}

// =============================================
// STATISTICS QUERIES
// =============================================

/**
 * Get count of unread operator messages across all tickets for user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const supabase = createServiceClient()

  // Get all ticket IDs owned by user
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id')
    .eq('created_by', userId)

  if (!tickets || tickets.length === 0) {
    return 0
  }

  const ticketIds = tickets.map((t) => t.id)

  // Count unread operator messages in those tickets
  const { count, error } = await supabase
    .from('ticket_messages')
    .select('id', { count: 'exact', head: true })
    .in('ticket_id', ticketIds)
    .eq('sender_type', 'operator')
    .is('read_at', null)

  if (error) {
    throw new Error(`Fehler beim Zaehlen ungelesener Nachrichten: ${error.message}`)
  }

  return count || 0
}
