/**
 * Suppliers API - List suppliers (partners with type='supplier')
 *
 * GET /api/suppliers - List suppliers with optional filters
 *
 * Phase: 19-supplier-core, Plan: 01
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { Partner } from '@/types/database'

// Internal roles that can manage suppliers
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/suppliers - List suppliers
 *
 * Query params:
 * - is_active: Filter by is_active boolean ('true' or 'false')
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
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

    // Only internal roles can view suppliers
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const isActiveParam = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('partners')
      .select('*', { count: 'exact' })
      .eq('partner_type', 'supplier') // Hard-coded filter for suppliers
      .order('company_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true'
      query = query.eq('is_active', isActive)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const suppliers = (data || []) as Partner[]

    return NextResponse.json({
      suppliers,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/suppliers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
