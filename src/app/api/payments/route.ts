/**
 * Payments API - Collection Routes
 *
 * POST /api/payments - Create a payment (Mark as Paid)
 * GET /api/payments - List payments (with filters)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, PaymentMethod } from '@/types'
import type { CreatePaymentInput, Payment, Invoice } from '@/types/database'

// Select query for payments with invoice relation
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

/**
 * GET /api/payments - List payments
 *
 * Query params:
 * - invoice_id: Filter by invoice
 * - date_from: Filter by payment_date >= date
 * - date_to: Filter by payment_date <= date
 * - status: Filter by status (comma-separated)
 * - limit: Max results (default 50)
 * - offset: Pagination offset
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

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const invoiceId = searchParams.get('invoice_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('payments')
      .select(PAYMENT_SELECT, { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }
    if (dateFrom) {
      query = query.gte('payment_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('payment_date', dateTo)
    }
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      payments: data,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments - Create a payment (Mark as Paid)
 *
 * Body: {
 *   invoice_id: string (required)
 *   amount?: number (default: outstanding amount)
 *   payment_method?: PaymentMethod (default: bank_transfer)
 *   payment_date?: string (default: today)
 *   bank_reference?: string
 *   notes?: string
 * }
 *
 * Validates:
 * - Invoice exists and is 'approved' status
 * - Amount does not exceed outstanding balance
 *
 * Note: Database trigger handles invoice.amount_paid and status updates
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

    // Only kewa (admin) and accounting roles can create payments
    if (!['kewa', 'admin', 'accounting', 'property_manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required field
    if (!body.invoice_id) {
      return NextResponse.json(
        { error: 'invoice_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch invoice to validate status and get outstanding amount
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total_amount, amount_paid, amount_outstanding, status')
      .eq('id', body.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Validate invoice is approved
    if (invoice.status !== 'approved') {
      return NextResponse.json(
        { error: `Invoice must be approved to record payment. Current status: ${invoice.status}` },
        { status: 400 }
      )
    }

    // Determine payment amount (default to full outstanding)
    const outstanding = invoice.amount_outstanding ?? (invoice.total_amount - (invoice.amount_paid ?? 0))
    const amount = body.amount ?? outstanding

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (amount > outstanding) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds outstanding balance (${outstanding})` },
        { status: 400 }
      )
    }

    // Set defaults
    const paymentDate = body.payment_date ?? new Date().toISOString().split('T')[0]
    const paymentMethod: PaymentMethod = body.payment_method ?? 'bank_transfer'

    // Create payment
    // Note: The database trigger `update_invoice_paid_amount` will automatically
    // update invoice.amount_paid and status
    const { data: payment, error: createError } = await supabase
      .from('payments')
      .insert({
        invoice_id: body.invoice_id,
        amount,
        currency: 'CHF',
        payment_method: paymentMethod,
        payment_date: paymentDate,
        status: 'completed',
        bank_reference: body.bank_reference ?? null,
        notes: body.notes ?? null,
        created_by: userId
      })
      .select(PAYMENT_SELECT)
      .single()

    if (createError) {
      console.error('Error creating payment:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
