/**
 * Ticket Query Helpers
 *
 * Server-side query helpers for tenant tickets with full CRUD operations.
 * All queries enforce tenant isolation by user_id.
 *
 * Phase 26: Tenant Portal Core
 */

import { createClient } from '@/lib/supabase/server'
import { getTenantContext, verifyTicketOwnership } from './tenant-isolation'
import type {
  Ticket,
  TicketWithDetails,
  TicketCategory,
  CreateTicketInput,
} from '@/types/portal'

// =============================================
// TICKET QUERIES
// =============================================

/**
 * Get all tickets for a tenant user
 *
 * Returns tickets with category, unit details, and message counts.
 * Ordered by last_message_at DESC (most recent activity first).
 */
export async function getTickets(userId: string): Promise<TicketWithDetails[]> {
  const supabase = await createClient()

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      category:ticket_categories (
        id,
        name,
        display_name
      ),
      unit:units (
        id,
        name,
        building_id
      )
    `
    )
    .eq('created_by', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Fehler beim Laden der Tickets: ${error.message}`)
  }

  // Add message counts via separate queries
  const ticketsWithCounts = await Promise.all(
    (tickets || []).map(async (ticket) => {
      const { count: messageCount } = await supabase
        .from('ticket_messages')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticket.id)

      const { count: unreadCount } = await supabase
        .from('ticket_messages')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticket.id)
        .eq('sender_type', 'operator')
        .is('read_at', null)

      return {
        ...ticket,
        message_count: messageCount || 0,
        unread_count: unreadCount || 0,
      } as TicketWithDetails
    })
  )

  return ticketsWithCounts
}

/**
 * Get a single ticket by ID with full details
 *
 * @throws Error if ticket not found or not owned by user
 */
export async function getTicketById(
  userId: string,
  ticketId: string
): Promise<TicketWithDetails> {
  // Verify ownership first
  await verifyTicketOwnership(userId, ticketId)

  const supabase = await createClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      category:ticket_categories (
        id,
        name,
        display_name
      ),
      unit:units (
        id,
        name,
        building_id
      )
    `
    )
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    throw new Error('Ticket nicht gefunden')
  }

  // Add message counts
  const { count: messageCount } = await supabase
    .from('ticket_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)

  const { count: unreadCount } = await supabase
    .from('ticket_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .eq('sender_type', 'operator')
    .is('read_at', null)

  return {
    ...ticket,
    message_count: messageCount || 0,
    unread_count: unreadCount || 0,
  } as TicketWithDetails
}

/**
 * Create a new ticket
 *
 * Unit ID is automatically derived from tenant context.
 */
export async function createTicket(
  userId: string,
  input: CreateTicketInput
): Promise<Ticket> {
  // Get tenant context to retrieve unit_id
  const { unitId } = await getTenantContext(userId)

  const supabase = await createClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      category_id: input.category_id,
      unit_id: unitId,
      created_by: userId,
      title: input.title,
      description: input.description,
      urgency: input.urgency || 'normal',
    })
    .select()
    .single()

  if (error || !ticket) {
    throw new Error(`Fehler beim Erstellen des Tickets: ${error?.message}`)
  }

  return ticket as Ticket
}

/**
 * Cancel a ticket (tenant can only cancel if status is 'offen')
 *
 * @throws Error if ticket is not in 'offen' status or not owned by user
 */
export async function cancelTicket(userId: string, ticketId: string): Promise<Ticket> {
  // Verify ownership
  const ticket = await verifyTicketOwnership(userId, ticketId)

  if (ticket.status !== 'offen') {
    throw new Error('Nur offene Tickets können storniert werden')
  }

  const supabase = await createClient()

  const { data: updatedTicket, error } = await supabase
    .from('tickets')
    .update({
      status: 'storniert',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (error || !updatedTicket) {
    throw new Error(`Fehler beim Stornieren des Tickets: ${error?.message}`)
  }

  return updatedTicket as Ticket
}

// =============================================
// CATEGORY QUERIES
// =============================================

/**
 * Get all active ticket categories
 *
 * Ordered by sort_order for consistent display.
 */
export async function getTicketCategories(): Promise<TicketCategory[]> {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('ticket_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Fehler beim Laden der Kategorien: ${error.message}`)
  }

  return (categories || []) as TicketCategory[]
}

// =============================================
// STATISTICS QUERIES
// =============================================

/**
 * Get count of open and in-progress tickets for user
 */
export async function getOpenTicketCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .in('status', ['offen', 'in_bearbeitung'])

  if (error) {
    throw new Error(`Fehler beim Zaehlen der offenen Tickets: ${error.message}`)
  }

  return count || 0
}

/**
 * Get recent tickets (limited list for dashboard)
 */
export async function getRecentTickets(
  userId: string,
  limit = 5
): Promise<TicketWithDetails[]> {
  const tickets = await getTickets(userId)
  return tickets.slice(0, limit)
}
