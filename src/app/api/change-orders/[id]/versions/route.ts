/**
 * Change Orders API - Version History Route
 *
 * GET /api/change-orders/[id]/versions - Get version history
 *
 * Phase 21-02: Approval Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Roles that can view version history
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/change-orders/[id]/versions - Get version history
 *
 * Returns all versions from change_order_versions table for a change order
 * Ordered by version DESC (newest first)
 * Includes revised_by user name via join
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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can view version history
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid change order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify change order exists
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id, co_number')
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Get all versions for this change order
    const { data: versions, error: versionsError } = await supabase
      .from('change_order_versions')
      .select(`
        version_id,
        change_order_id,
        version,
        description,
        line_items,
        total_amount,
        schedule_impact_days,
        revised_by,
        revised_at,
        revision_reason
      `)
      .eq('change_order_id', id)
      .order('version', { ascending: false }) // Newest first

    if (versionsError) {
      console.error('Error fetching version history:', versionsError)
      return NextResponse.json(
        { error: 'Failed to fetch version history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      change_order_id: id,
      co_number: changeOrder.co_number,
      versions: versions ?? [],
      total_versions: versions?.length ?? 0,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/change-orders/[id]/versions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
