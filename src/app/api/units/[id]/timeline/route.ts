import { NextRequest, NextResponse } from 'next/server'
import { fetchUnitTimeline } from '@/lib/units/timeline-queries'
import type { TimelineResponse } from '@/types/timeline'
import type { ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/units/[id]/timeline
 *
 * Returns a unified timeline of all unit activities:
 * - Renovation projects (created, status changes)
 * - Work orders (created, accepted, completed)
 * - Condition history (room condition changes)
 * - Paid invoices
 *
 * Query params:
 * - limit: Max events (default 20, max 100)
 * - offset: Pagination offset (default 0)
 *
 * Phase 11-01: Unit Timeline View
 * Requirement: HIST-01
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TimelineResponse | ErrorResponse>> {
  try {
    const { id: unitId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only KEWA role can access timeline (contains cost data)
    // Future: Add more granular permissions via v2.0 RBAC
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate parameters
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      )
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter' },
        { status: 400 }
      )
    }

    // Fetch timeline
    const timeline = await fetchUnitTimeline(unitId, limit, offset)

    return NextResponse.json(timeline)
  } catch (error) {
    console.error('Error in GET /api/units/[id]/timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
