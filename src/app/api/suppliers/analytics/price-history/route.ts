/**
 * Price History Analytics API
 *
 * GET /api/suppliers/analytics/price-history - Get delivery price trends
 *
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import { getPriceHistory, type PriceHistoryFilters } from '@/lib/suppliers/analytics-queries'

// Internal roles that can view analytics
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/suppliers/analytics/price-history - Get price history
 *
 * Query params:
 * - supplier_id: Filter by supplier (optional)
 * - property_id: Filter by property (optional)
 * - from: Start date YYYY-MM-DD (optional)
 * - to: End date YYYY-MM-DD (optional)
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

    const supabase = await createOrgClient(request)
    const { searchParams } = new URL(request.url)

    // Parse filters
    const filters: PriceHistoryFilters = {}

    const supplierId = searchParams.get('supplier_id')
    if (supplierId) filters.supplier_id = supplierId

    const propertyId = searchParams.get('property_id')
    if (propertyId) filters.property_id = propertyId

    const from = searchParams.get('from')
    if (from) filters.date_from = from

    const to = searchParams.get('to')
    if (to) filters.date_to = to

    // Fetch price history
    const prices = await getPriceHistory(supabase, filters)

    // Enrich with supplier and property names
    const enrichedPrices = await Promise.all(
      prices.map(async (price) => {
        // Fetch supplier name
        let supplierName = null
        if (price.supplier_id) {
          const { data: supplier } = await supabase
            .from('partners')
            .select('company_name')
            .eq('id', price.supplier_id)
            .single()
          supplierName = supplier?.company_name ?? null
        }

        // Fetch property name
        let propertyName = null
        if (price.property_id) {
          const { data: property } = await supabase
            .from('properties')
            .select('name')
            .eq('id', price.property_id)
            .single()
          propertyName = property?.name ?? null
        }

        return {
          ...price,
          supplier_name: supplierName,
          property_name: propertyName,
        }
      })
    )

    return NextResponse.json({
      prices: enrichedPrices,
      filters_applied: filters,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/suppliers/analytics/price-history:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
