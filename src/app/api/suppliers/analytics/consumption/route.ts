/**
 * Seasonal Consumption Analytics API
 *
 * GET /api/suppliers/analytics/consumption - Get seasonal consumption patterns
 *
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { getSeasonalConsumption, getMonthName } from '@/lib/suppliers/analytics-queries'

// Internal roles that can view analytics
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/suppliers/analytics/consumption - Get seasonal consumption
 *
 * Query params:
 * - property_id: Filter by property (optional)
 */
export async function GET(request: NextRequest) {
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

    // Only internal roles can view analytics
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filter
    const propertyId = searchParams.get('property_id') || undefined

    // Fetch seasonal consumption
    const consumption = await getSeasonalConsumption(supabase, propertyId)

    // Enrich with German month names and property names
    const enrichedConsumption = await Promise.all(
      consumption.map(async (item) => {
        // Fetch property name
        let propertyName = null
        if (item.property_id) {
          const { data: property } = await supabase
            .from('properties')
            .select('name')
            .eq('id', item.property_id)
            .single()
          propertyName = property?.name ?? null
        }

        return {
          ...item,
          monthName: getMonthName(item.month),
          property_name: propertyName,
        }
      })
    )

    return NextResponse.json({
      consumption: enrichedConsumption,
      property_id: propertyId ?? null,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/suppliers/analytics/consumption:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
