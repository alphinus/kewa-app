/**
 * Reorder Alerts API
 *
 * GET /api/reorder-alerts - Get active reorder alerts
 *
 * Phase 20-02: Inventory Tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { getReorderAlerts } from '@/lib/suppliers/alert-calculations'

// Internal roles that can view reorder alerts
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/reorder-alerts - Get active reorder alerts
 *
 * Query params:
 * - threshold: Percentage threshold (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can view alerts
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse threshold
    const threshold = parseInt(searchParams.get('threshold') || '20', 10)

    if (threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: 'Threshold must be between 0 and 100' },
        { status: 400 }
      )
    }

    const alerts = await getReorderAlerts(supabase, threshold)

    return NextResponse.json({
      alerts,
      threshold,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/reorder-alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
