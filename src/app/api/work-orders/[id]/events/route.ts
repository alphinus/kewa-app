/**
 * Work Order Events API
 *
 * GET /api/work-orders/[id]/events - Get paginated event list
 *
 * KEWA/Imeri only - contractors see limited events in portal.
 *
 * Implements: EXT-14 (Event log viewable in admin UI)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSessionWithRBAC, SESSION_COOKIE_NAME } from '@/lib/session'
import { isInternalRole } from '@/lib/permissions'
import { getWorkOrderEvents, type WorkOrderEventType } from '@/lib/work-orders/events'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/work-orders/[id]/events
 *
 * Query parameters:
 * - limit: Number of events to return (default 50, max 100)
 * - offset: Pagination offset (default 0)
 * - types: Comma-separated list of event types to filter
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSessionWithRBAC(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can view events
    if (!isInternalRole(session.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: workOrderId } = await context.params

    // Validate UUID format
    if (!workOrderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    // Verify work order exists
    const supabase = await createOrgClient(request)
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .single()

    if (fetchError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const typesParam = searchParams.get('types')

    // Parse event types filter
    let eventTypes: WorkOrderEventType[] | undefined
    if (typesParam) {
      eventTypes = typesParam.split(',') as WorkOrderEventType[]
    }

    // Get events
    const { events, total } = await getWorkOrderEvents(workOrderId, {
      limit,
      offset,
      eventTypes,
    })

    return NextResponse.json({
      events,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + events.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching work order events:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
