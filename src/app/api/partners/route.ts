/**
 * Partners API - Collection Routes
 *
 * POST /api/partners - Create a new partner
 * GET /api/partners - List partners (with filters)
 *
 * Phase 13-01: Partner API CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, PartnerType, TradeCategory } from '@/types'
import type { Partner } from '@/types/database'

// Internal roles that can manage partners
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/partners - List partners
 *
 * Query params:
 * - type: Filter by partner_type ('contractor' or 'supplier')
 * - is_active: Filter by is_active boolean ('true' or 'false')
 * - trade: Filter by trade_categories array contains
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

    // Only internal roles can view partners
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const type = searchParams.get('type') as PartnerType | null
    const isActiveParam = searchParams.get('is_active')
    const trade = searchParams.get('trade') as TradeCategory | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('partners')
      .select('*', { count: 'exact' })
      .order('company_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type) {
      query = query.eq('partner_type', type)
    }
    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true'
      query = query.eq('is_active', isActive)
    }
    if (trade) {
      query = query.contains('trade_categories', [trade])
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching partners:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const partners = (data || []) as Partner[]

    return NextResponse.json({
      partners,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/partners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/partners - Create a new partner
 *
 * Body: CreatePartnerInput
 *
 * Validates:
 * - company_name is required
 * - partner_type is required ('contractor' or 'supplier')
 * - email is required for contractors, optional for suppliers
 * - trade_categories must be array if provided
 */
export async function POST(request: NextRequest) {
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

    // Only internal roles can create partners
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.company_name || !body.company_name.trim()) {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      )
    }

    if (!body.partner_type) {
      return NextResponse.json(
        { error: 'partner_type is required' },
        { status: 400 }
      )
    }

    if (body.partner_type !== 'contractor' && body.partner_type !== 'supplier') {
      return NextResponse.json(
        { error: 'partner_type must be "contractor" or "supplier"' },
        { status: 400 }
      )
    }

    // Email is required for contractors
    if (body.partner_type === 'contractor') {
      if (!body.email || !body.email.trim()) {
        return NextResponse.json(
          { error: 'email is required for contractors' },
          { status: 400 }
        )
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate trade_categories is an array if provided
    if (body.trade_categories !== undefined && !Array.isArray(body.trade_categories)) {
      return NextResponse.json(
        { error: 'trade_categories must be an array' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create partner
    const { data: partner, error: createError } = await supabase
      .from('partners')
      .insert({
        partner_type: body.partner_type,
        company_name: body.company_name.trim(),
        contact_name: body.contact_name?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        trade_categories: body.trade_categories || [],
        is_active: body.is_active !== undefined ? body.is_active : true,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating partner:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ partner }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/partners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
