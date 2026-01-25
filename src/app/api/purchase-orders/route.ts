/**
 * Purchase Orders API - Collection Routes
 *
 * GET /api/purchase-orders - List purchase orders with filters
 * POST /api/purchase-orders - Create a new purchase order
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { PurchaseOrderStatus } from '@/lib/suppliers/status-utils'
import { calculateLineItemsTotal, type PurchaseOrderLineItem } from '@/lib/suppliers/purchase-order-queries'

// Internal roles that can manage purchase orders
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Select query with supplier join
const PURCHASE_ORDER_SELECT = `
  *,
  supplier:partners!supplier_id (
    id,
    company_name,
    contact_name,
    email,
    phone
  )
`

/**
 * GET /api/purchase-orders - List purchase orders
 *
 * Query params:
 * - supplier_id: Filter by supplier
 * - status: Filter by status
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

    // Only internal roles can view purchase orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status') as PurchaseOrderStatus | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('purchase_orders')
      .select(PURCHASE_ORDER_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      purchase_orders: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/purchase-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/purchase-orders - Create a new purchase order
 *
 * Body:
 * - supplier_id: UUID (required)
 * - line_items: PurchaseOrderLineItem[] (required, non-empty)
 * - expected_delivery_date?: string (YYYY-MM-DD)
 * - notes?: string
 * - status?: 'draft' | 'ordered' (default: 'draft')
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

    // Only internal roles can create purchase orders
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.supplier_id) {
      return NextResponse.json(
        { error: 'supplier_id is required' },
        { status: 400 }
      )
    }

    if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
      return NextResponse.json(
        { error: 'line_items is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify supplier exists and is type='supplier'
    const { data: supplier, error: supplierError } = await supabase
      .from('partners')
      .select('id, partner_type, company_name')
      .eq('id', body.supplier_id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (supplier.partner_type !== 'supplier') {
      return NextResponse.json(
        { error: 'Partner is not a supplier' },
        { status: 400 }
      )
    }

    // Calculate total from line items
    const lineItems: PurchaseOrderLineItem[] = body.line_items
    const totalAmount = calculateLineItemsTotal(lineItems)

    // Generate order number via RPC
    const { data: orderNumber, error: rpcError } = await supabase
      .rpc('generate_purchase_order_number')

    if (rpcError) {
      console.error('Error generating order number:', rpcError)
      return NextResponse.json(
        { error: 'Failed to generate order number' },
        { status: 500 }
      )
    }

    // Determine initial status (default: draft)
    const status = body.status === 'ordered' ? 'ordered' : 'draft'

    // Build insert data
    const insertData = {
      supplier_id: body.supplier_id,
      order_number: orderNumber,
      status,
      line_items: lineItems,
      total_amount: totalAmount,
      expected_delivery_date: body.expected_delivery_date ?? null,
      notes: body.notes?.trim() || null,
      created_by: userId,
      // Set ordered_at if creating with ordered status
      ...(status === 'ordered' && { ordered_at: new Date().toISOString() }),
    }

    const { data: purchaseOrder, error: createError } = await supabase
      .from('purchase_orders')
      .insert(insertData)
      .select(PURCHASE_ORDER_SELECT)
      .single()

    if (createError) {
      console.error('Error creating purchase order:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ purchase_order: purchaseOrder }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/purchase-orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
