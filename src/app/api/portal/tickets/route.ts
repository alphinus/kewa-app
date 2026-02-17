/**
 * Portal Tickets API
 *
 * GET /api/portal/tickets - List all tickets for current tenant
 * POST /api/portal/tickets - Create a new ticket
 *
 * Tenant isolation via x-portal-user-id header (set by middleware).
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTickets, createTicket } from '@/lib/portal/ticket-queries'
import type { CreateTicketInput } from '@/types/portal'

/**
 * GET /api/portal/tickets
 *
 * List all tickets for the authenticated tenant user.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const tickets = await getTickets(userId)

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden der Tickets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portal/tickets
 *
 * Create a new ticket for the authenticated tenant user.
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { category_id, title, description, urgency } = body as CreateTicketInput

    // Validate required fields
    if (!category_id || !title || !description) {
      return NextResponse.json(
        { error: 'Kategorie, Titel und Beschreibung sind erforderlich' },
        { status: 400 }
      )
    }

    // Validate category_id is UUID
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(category_id)) {
      return NextResponse.json(
        { error: 'Ungültige Kategorie-ID' },
        { status: 400 }
      )
    }

    // Validate title length
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Titel zu lang (max. 200 Zeichen)' },
        { status: 400 }
      )
    }

    // Validate description length
    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Beschreibung zu lang (max. 2000 Zeichen)' },
        { status: 400 }
      )
    }

    // Validate urgency if provided
    if (urgency && !['notfall', 'dringend', 'normal'].includes(urgency)) {
      return NextResponse.json(
        { error: 'Ungültige Dringlichkeit' },
        { status: 400 }
      )
    }

    const ticket = await createTicket(userId, {
      category_id,
      title,
      description,
      urgency,
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Tickets' },
      { status: 500 }
    )
  }
}
