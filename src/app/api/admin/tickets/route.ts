/**
 * Admin Tickets API
 *
 * GET /api/admin/tickets - List all tickets with filters
 *
 * Operator endpoint for viewing and managing tenant tickets.
 * Includes unread_message_count for tenant messages not yet read by operator.
 * Phase 29: Tenant Extras & UX
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

// =============================================
// GET - List tickets
// =============================================

/**
 * GET /api/admin/tickets
 *
 * List all tickets with optional filters.
 *
 * Query params:
 * - status: Filter by status (comma-separated for multiple)
 * - urgency: Filter by urgency (comma-separated for multiple)
 * - building_id: Filter by building
 * - unit_id: Filter by unit
 * - category_id: Filter by category
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 *
 * Ordered by urgency (notfall first), then last_message_at DESC.
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as UserRole | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only operators can view all tickets
    if (!['admin', 'property_manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const buildingId = searchParams.get('building_id')
    const unitId = searchParams.get('unit_id')
    const categoryId = searchParams.get('category_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createClient()

    // Build query
    let query = supabase
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
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      // Order by urgency (notfall first - PostgreSQL enum ordering)
      .order('urgency', { ascending: true })
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    if (urgency) {
      const urgencies = urgency.split(',')
      query = query.in('urgency', urgencies)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (unitId) {
      query = query.eq('unit_id', unitId)
    }

    // Execute query
    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching tickets:', error)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Tickets' },
        { status: 500 }
      )
    }

    // Filter by building if specified (post-query since it's a nested relation)
    let filteredTickets = tickets || []
    if (buildingId) {
      filteredTickets = filteredTickets.filter((ticket) => {
        const unit = ticket.unit as { building: { id: string } } | null
        return unit?.building?.id === buildingId
      })
    }

    // Add message counts via separate queries
    const ticketsWithCounts = await Promise.all(
      filteredTickets.map(async (ticket) => {
        const { count: messageCount } = await supabase
          .from('ticket_messages')
          .select('id', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)

        const { count: unreadCount } = await supabase
          .from('ticket_messages')
          .select('id', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('sender_type', 'tenant')
          .is('read_at', null)

        return {
          ...ticket,
          message_count: messageCount || 0,
          unread_message_count: unreadCount || 0,
        }
      })
    )

    return NextResponse.json({
      tickets: ticketsWithCounts,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/tickets:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
