/**
 * Partners API - Single Resource Routes
 *
 * GET /api/partners/[id] - Get partner by ID
 * PATCH /api/partners/[id] - Update partner fields
 * DELETE /api/partners/[id] - Delete partner
 *
 * Phase 13-01: Partner API CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { Partner } from '@/types/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Allowed fields for PATCH update
 */
interface UpdatePartnerInput {
  company_name?: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  trade_categories?: string[]
  is_active?: boolean
  notes?: string | null
}

/**
 * GET /api/partners/[id] - Get partner by ID
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

    // Only kewa and imeri can view partners
    if (userRole !== 'kewa' && userRole !== 'imeri') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid partner ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Partner not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching partner:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ partner })
  } catch (error) {
    console.error('Unexpected error in GET /api/partners/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/partners/[id] - Update partner fields
 *
 * Allowed updates:
 * - company_name, contact_name, email, phone, address
 * - trade_categories (array)
 * - is_active (boolean)
 * - notes
 */
export async function PATCH(
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

    // Only kewa and imeri can update partners
    if (userRole !== 'kewa' && userRole !== 'imeri') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid partner ID format' },
        { status: 400 }
      )
    }

    const body: UpdatePartnerInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check partner exists
    const { data: existing, error: checkError } = await supabase
      .from('partners')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Build update object (only include allowed fields)
    const updateData: Record<string, unknown> = {}

    if (body.company_name !== undefined) {
      if (!body.company_name || !body.company_name.trim()) {
        return NextResponse.json(
          { error: 'company_name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.company_name = body.company_name.trim()
    }

    if (body.contact_name !== undefined) {
      updateData.contact_name = body.contact_name?.trim() || null
    }

    if (body.email !== undefined) {
      if (body.email) {
        // Validate email format if provided
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(body.email.trim())) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          )
        }
        updateData.email = body.email.trim()
      } else {
        updateData.email = null
      }
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim() || null
    }

    if (body.trade_categories !== undefined) {
      if (!Array.isArray(body.trade_categories)) {
        return NextResponse.json(
          { error: 'trade_categories must be an array' },
          { status: 400 }
        )
      }
      updateData.trade_categories = body.trade_categories
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active must be a boolean' },
          { status: 400 }
        )
      }
      updateData.is_active = body.is_active
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update partner
    const { data: partner, error: updateError } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating partner:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ partner })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/partners/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/partners/[id] - Delete partner
 *
 * Only kewa (admin) role can delete partners.
 * Note: Deleting partners with active work orders may cause issues.
 */
export async function DELETE(
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

    // Only kewa (admin) can delete partners
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid partner ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check partner exists
    const { data: existing, error: checkError } = await supabase
      .from('partners')
      .select('id, company_name')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Optional: Check for active work orders (soft validation)
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('partner_id', id)
      .in('status', ['open', 'in_progress', 'pending_review'])
      .limit(1)

    if (!woError && workOrders && workOrders.length > 0) {
      // Warning returned but deletion continues (admin can override)
      console.warn(`Deleting partner ${id} with active work orders`)
    }

    // Delete partner
    const { error: deleteError } = await supabase
      .from('partners')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting partner:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/partners/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
