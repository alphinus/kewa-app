/**
 * Deliveries API - Collection Routes
 *
 * GET /api/deliveries - List deliveries with filters
 * POST /api/deliveries - Create a new delivery
 *
 * Phase 19-03: Delivery Recording with Property Association
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { CreateDeliveryInput } from '@/types/suppliers'

// Internal roles that can manage deliveries
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Select query with joins
const DELIVERY_SELECT = `
  *,
  purchase_order:purchase_orders!purchase_order_id (
    id,
    order_number,
    supplier_id,
    status,
    supplier:partners!supplier_id (
      id,
      company_name
    )
  ),
  property:properties!property_id (
    id,
    name
  ),
  building:buildings!building_id (
    id,
    name
  ),
  invoice:invoices!invoice_id (
    id,
    invoice_number
  )
`

/**
 * GET /api/deliveries - List deliveries
 *
 * Query params:
 * - purchase_order_id: Filter by purchase order
 * - property_id: Filter by property
 * - supplier_id: Filter by supplier (through purchase_orders)
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

    // Only internal roles can view deliveries
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const purchaseOrderId = searchParams.get('purchase_order_id')
    const propertyId = searchParams.get('property_id')
    const supplierId = searchParams.get('supplier_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // If supplier_id is provided, we need to get deliveries through purchase_orders
    if (supplierId) {
      // First get purchase order IDs for this supplier
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('supplier_id', supplierId)

      if (poError) {
        console.error('Error fetching purchase orders for supplier:', poError)
        return NextResponse.json({ error: poError.message }, { status: 500 })
      }

      const poIds = purchaseOrders?.map(po => po.id) || []

      if (poIds.length === 0) {
        // No purchase orders for this supplier, return empty
        return NextResponse.json({
          deliveries: [],
          total: 0,
          limit,
          offset,
        })
      }

      let query = supabase
        .from('deliveries')
        .select(DELIVERY_SELECT, { count: 'exact' })
        .in('purchase_order_id', poIds)
        .order('delivery_date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (purchaseOrderId) {
        query = query.eq('purchase_order_id', purchaseOrderId)
      }
      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching deliveries:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        deliveries: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      })
    }

    // Standard query without supplier filter
    let query = supabase
      .from('deliveries')
      .select(DELIVERY_SELECT, { count: 'exact' })
      .order('delivery_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (purchaseOrderId) {
      query = query.eq('purchase_order_id', purchaseOrderId)
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching deliveries:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      deliveries: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/deliveries - Create a new delivery
 *
 * Body:
 * - purchase_order_id: UUID (required)
 * - delivery_date: string (required, YYYY-MM-DD)
 * - quantity_ordered: number (required)
 * - quantity_received: number (required)
 * - quantity_unit: string (required)
 * - property_id: UUID (required)
 * - building_id?: UUID
 * - delivery_note_number?: string
 * - variance_note?: string
 * - notes?: string
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

    // Only internal roles can create deliveries
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateDeliveryInput = await request.json()

    // Validate required fields
    if (!body.purchase_order_id) {
      return NextResponse.json(
        { error: 'purchase_order_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(body.purchase_order_id)) {
      return NextResponse.json(
        { error: 'Invalid purchase_order_id format' },
        { status: 400 }
      )
    }

    if (!body.delivery_date) {
      return NextResponse.json(
        { error: 'delivery_date is required' },
        { status: 400 }
      )
    }

    if (body.quantity_ordered === undefined || body.quantity_ordered === null) {
      return NextResponse.json(
        { error: 'quantity_ordered is required' },
        { status: 400 }
      )
    }

    if (body.quantity_received === undefined || body.quantity_received === null) {
      return NextResponse.json(
        { error: 'quantity_received is required' },
        { status: 400 }
      )
    }

    if (!body.quantity_unit) {
      return NextResponse.json(
        { error: 'quantity_unit is required' },
        { status: 400 }
      )
    }

    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(body.property_id)) {
      return NextResponse.json(
        { error: 'Invalid property_id format' },
        { status: 400 }
      )
    }

    if (body.building_id && !UUID_REGEX.test(body.building_id)) {
      return NextResponse.json(
        { error: 'Invalid building_id format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify purchase order exists and is in 'confirmed' status
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, status, order_number')
      .eq('id', body.purchase_order_id)
      .single()

    if (poError || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (purchaseOrder.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Lieferung kann nur fuer bestaetigte Bestellungen erfasst werden. Aktueller Status: ${purchaseOrder.status}` },
        { status: 400 }
      )
    }

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', body.property_id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // If building_id provided, verify it belongs to property
    if (body.building_id) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name, property_id')
        .eq('id', body.building_id)
        .single()

      if (buildingError || !building) {
        return NextResponse.json(
          { error: 'Building not found' },
          { status: 404 }
        )
      }

      if (building.property_id !== body.property_id) {
        return NextResponse.json(
          { error: 'Building does not belong to the specified property' },
          { status: 400 }
        )
      }
    }

    // Insert delivery
    const insertData = {
      purchase_order_id: body.purchase_order_id,
      delivery_date: body.delivery_date,
      delivery_note_number: body.delivery_note_number?.trim() || null,
      quantity_ordered: body.quantity_ordered,
      quantity_received: body.quantity_received,
      quantity_unit: body.quantity_unit,
      property_id: body.property_id,
      building_id: body.building_id || null,
      variance_note: body.variance_note?.trim() || null,
      notes: body.notes?.trim() || null,
      created_by: userId,
    }

    const { data: delivery, error: createError } = await supabase
      .from('deliveries')
      .insert(insertData)
      .select(DELIVERY_SELECT)
      .single()

    if (createError) {
      console.error('Error creating delivery:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Update purchase order status to 'delivered'
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status: 'delivered' })
      .eq('id', body.purchase_order_id)

    if (updateError) {
      console.error('Error updating purchase order status:', updateError)
      // Don't fail the delivery creation, just log the error
    }

    return NextResponse.json({ delivery }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
