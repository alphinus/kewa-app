/**
 * Inventory Movements API - Collection Routes
 *
 * GET /api/inventory-movements - List inventory movements
 * POST /api/inventory-movements - Create a new movement (reading/adjustment)
 *
 * Phase 20-02: Inventory Tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { CreateInventoryMovementInput } from '@/types/suppliers'
import { getPreviousReading, calculateConsumption } from '@/lib/suppliers/inventory-queries'

// Internal roles that can manage inventory
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Select query with joins
const MOVEMENT_SELECT = `
  *,
  property:properties!property_id (
    id,
    name
  ),
  delivery:deliveries!delivery_id (
    id,
    delivery_date
  )
`

/**
 * GET /api/inventory-movements - List inventory movements
 *
 * Query params:
 * - property_id: Filter by property
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can view inventory
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const propertyId = searchParams.get('property_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('inventory_movements')
      .select(MOVEMENT_SELECT, { count: 'exact' })
      .order('movement_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching inventory movements:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      movements: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/inventory-movements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/inventory-movements - Create a new movement
 *
 * Body:
 * - property_id: UUID (required)
 * - movement_type: 'delivery' | 'reading' | 'adjustment' (required)
 * - movement_date: string (required, YYYY-MM-DD)
 * - tank_level: number (required, tonnes)
 * - tank_capacity?: number (tonnes)
 * - building_id?: UUID
 * - delivery_id?: UUID (required if movement_type='delivery')
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only internal roles can create inventory movements
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateInventoryMovementInput = await request.json()

    // Validate required fields
    if (!body.property_id) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    if (!UUID_REGEX.test(body.property_id)) {
      return NextResponse.json(
        { error: 'Invalid property_id format' },
        { status: 400 }
      )
    }

    if (!body.movement_type) {
      return NextResponse.json({ error: 'movement_type is required' }, { status: 400 })
    }

    if (!['delivery', 'reading', 'adjustment'].includes(body.movement_type)) {
      return NextResponse.json(
        { error: 'movement_type must be delivery, reading, or adjustment' },
        { status: 400 }
      )
    }

    if (!body.movement_date) {
      return NextResponse.json({ error: 'movement_date is required' }, { status: 400 })
    }

    if (body.tank_level === undefined || body.tank_level === null) {
      return NextResponse.json({ error: 'tank_level is required' }, { status: 400 })
    }

    if (body.building_id && !UUID_REGEX.test(body.building_id)) {
      return NextResponse.json(
        { error: 'Invalid building_id format' },
        { status: 400 }
      )
    }

    if (body.delivery_id && !UUID_REGEX.test(body.delivery_id)) {
      return NextResponse.json(
        { error: 'Invalid delivery_id format' },
        { status: 400 }
      )
    }

    // Delivery type requires delivery_id
    if (body.movement_type === 'delivery' && !body.delivery_id) {
      return NextResponse.json(
        { error: 'delivery_id is required for delivery movements' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', body.property_id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // If building_id provided, verify it belongs to property
    if (body.building_id) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name, property_id')
        .eq('id', body.building_id)
        .single()

      if (buildingError || !building) {
        return NextResponse.json({ error: 'Building not found' }, { status: 404 })
      }

      if (building.property_id !== body.property_id) {
        return NextResponse.json(
          { error: 'Building does not belong to the specified property' },
          { status: 400 }
        )
      }
    }

    // Get previous reading to calculate consumption
    const previousReading = await getPreviousReading(
      supabase,
      body.property_id,
      body.movement_date
    )

    // Calculate consumption metrics
    const consumption = calculateConsumption(
      previousReading,
      body.tank_level,
      body.movement_date,
      body.movement_type
    )

    // Insert movement
    const insertData = {
      property_id: body.property_id,
      building_id: body.building_id || null,
      delivery_id: body.delivery_id || null,
      movement_type: body.movement_type,
      movement_date: body.movement_date,
      tank_level: body.tank_level,
      tank_capacity: body.tank_capacity || null,
      days_since_last: consumption.days_since_last,
      consumption_amount: consumption.consumption_amount,
      daily_usage_rate: consumption.daily_usage_rate,
      notes: body.notes?.trim() || null,
      created_by: userId,
    }

    const { data: movement, error: createError } = await supabase
      .from('inventory_movements')
      .insert(insertData)
      .select(MOVEMENT_SELECT)
      .single()

    if (createError) {
      console.error('Error creating inventory movement:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ movement }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/inventory-movements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
