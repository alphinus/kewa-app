/**
 * Purchase Order Allocations API
 *
 * GET /api/purchase-orders/[id]/allocations - List allocations for a PO
 * POST /api/purchase-orders/[id]/allocations - Create allocation for a PO
 *
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import { getAllocations, createAllocation } from '@/lib/suppliers/analytics-queries'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can manage allocations
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/purchase-orders/[id]/allocations - List allocations
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

    // Only internal roles can view allocations
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
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Verify purchase order exists
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('id', id)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Fetch allocations
    const allocations = await getAllocations(supabase, id)

    return NextResponse.json({
      allocations,
      purchase_order_id: id,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/purchase-orders/[id]/allocations:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/purchase-orders/[id]/allocations - Create allocation
 *
 * Body:
 * - property_id: UUID (required)
 * - building_id: UUID (optional)
 * - allocated_quantity: number (required)
 * - allocated_amount: number (required)
 * - notes: string (optional)
 */
export async function POST(
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

    // Only internal roles can create allocations
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
        { error: 'Invalid purchase order ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      )
    }

    if (typeof body.allocated_quantity !== 'number' || body.allocated_quantity <= 0) {
      return NextResponse.json(
        { error: 'allocated_quantity must be a positive number' },
        { status: 400 }
      )
    }

    if (typeof body.allocated_amount !== 'number' || body.allocated_amount <= 0) {
      return NextResponse.json(
        { error: 'allocated_amount must be a positive number' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Verify purchase order exists
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, total_amount')
      .eq('id', id)
      .single()

    if (poError || !po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', body.property_id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Create allocation (database trigger validates total does not exceed PO amount)
    try {
      const allocation = await createAllocation(supabase, {
        purchase_order_id: id,
        property_id: body.property_id,
        building_id: body.building_id,
        allocated_quantity: body.allocated_quantity,
        allocated_amount: body.allocated_amount,
        notes: body.notes,
      })

      return NextResponse.json({ allocation }, { status: 201 })
    } catch (error) {
      // Catch database trigger validation error
      if (error instanceof Error && error.message.includes('exceeds total amount')) {
        return NextResponse.json(
          { error: 'Allocation exceeds purchase order total amount' },
          { status: 400 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/purchase-orders/[id]/allocations:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
