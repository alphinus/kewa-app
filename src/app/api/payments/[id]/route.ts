/**
 * Payments API - Single Payment Routes
 *
 * GET /api/payments/[id] - Get single payment with invoice relation
 * DELETE /api/payments/[id] - Delete payment (only pending/failed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, PaymentStatus } from '@/types'

// Select query for payment with invoice relation
const PAYMENT_SELECT = `
  *,
  invoice:invoices (
    id,
    invoice_number,
    partner_id,
    total_amount,
    amount_paid,
    amount_outstanding,
    status,
    partner:partners (
      id,
      company_name
    )
  )
`

// Statuses that allow deletion
const DELETABLE_STATUSES: PaymentStatus[] = ['pending', 'failed']

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/payments/[id] - Get single payment
 *
 * Returns payment with invoice and partner relations
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

    const { id } = await context.params
    const supabase = await createClient()

    const { data: payment, error } = await supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching payment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Unexpected error in GET /api/payments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/payments/[id] - Delete a payment
 *
 * Only allows deletion of payments with status 'pending' or 'failed'.
 * Completed payments cannot be deleted (immutable audit trail).
 *
 * Note: Deleting a payment will trigger the database function
 * `update_invoice_paid_amount` to recalculate the invoice.
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

    // Only kewa (admin) role can delete payments
    if (!['kewa', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const supabase = await createClient()

    // First, check if payment exists and get its status
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching payment:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Check if payment can be deleted
    if (!DELETABLE_STATUSES.includes(payment.status as PaymentStatus)) {
      return NextResponse.json(
        {
          error: `Cannot delete payment with status '${payment.status}'. Only pending or failed payments can be deleted.`
        },
        { status: 400 }
      )
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting payment:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/payments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
