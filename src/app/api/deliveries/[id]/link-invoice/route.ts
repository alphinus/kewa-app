/**
 * Deliveries API - Invoice Linking Route
 *
 * POST /api/deliveries/[id]/link-invoice - Link delivery to invoice
 *
 * Phase 19-03: Delivery Recording with Invoice Linking (SUPP-06)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Internal roles that can link invoices
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Valid invoice statuses for linking
const VALID_INVOICE_STATUSES = ['received', 'under_review', 'approved', 'paid']

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
 * POST /api/deliveries/[id]/link-invoice - Link delivery to invoice
 *
 * Body:
 * - invoice_id: UUID (required)
 *
 * Validates:
 * - Invoice exists and is in valid status
 * - Invoice belongs to same supplier as purchase order
 * - Updates purchase order status to 'invoiced' if not already
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

    // Only internal roles can link invoices
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
        { error: 'Invalid delivery ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate invoice_id
    if (!body.invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(body.invoice_id)) {
      return NextResponse.json(
        { error: 'Invalid invoice_id format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Get delivery with purchase order info
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, purchase_order_id, invoice_id')
      .eq('id', id)
      .single()

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Get purchase order to validate supplier
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, supplier_id, status')
      .eq('id', delivery.purchase_order_id)
      .single()

    if (poError || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Get invoice and validate
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, partner_id')
      .eq('id', body.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Validate invoice status
    if (!VALID_INVOICE_STATUSES.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Rechnung kann nicht verknüpft werden. Status "${invoice.status}" ist ungültig. Erlaubt: ${VALID_INVOICE_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate invoice belongs to same supplier as purchase order
    if (invoice.partner_id !== purchaseOrder.supplier_id) {
      return NextResponse.json(
        { error: 'Rechnung gehoert nicht zum selben Lieferanten wie die Bestellung' },
        { status: 400 }
      )
    }

    // Update delivery with invoice_id
    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update({ invoice_id: body.invoice_id })
      .eq('id', id)
      .select(DELIVERY_SELECT)
      .single()

    if (updateError) {
      console.error('Error linking invoice to delivery:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update purchase order status to 'invoiced' if currently 'delivered'
    if (purchaseOrder.status === 'delivered') {
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({ status: 'invoiced' })
        .eq('id', delivery.purchase_order_id)

      if (poUpdateError) {
        console.error('Error updating purchase order status:', poUpdateError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      delivery: updatedDelivery,
      message: `Rechnung ${invoice.invoice_number} erfolgreich verknüpft`,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/deliveries/[id]/link-invoice:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
