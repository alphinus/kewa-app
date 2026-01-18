/**
 * Invoices API - Collection Routes
 *
 * GET /api/invoices - List invoices with filters and pagination
 * POST /api/invoices - Create a new invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INVOICE_SELECT, type InvoiceFilters } from '@/lib/costs/invoice-queries'
import type { Role } from '@/types'
import type { CreateInvoiceInput } from '@/types/database'

/**
 * GET /api/invoices - List invoices
 *
 * Query params:
 * - status: Filter by status
 * - project_id: Filter by project
 * - partner_id: Filter by partner
 * - date_from: Filter by invoice_date >= date
 * - date_to: Filter by invoice_date <= date
 * - offset: Pagination offset
 * - limit: Pagination limit (default 20)
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const filters: InvoiceFilters = {}

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!
    }
    if (searchParams.get('project_id')) {
      filters.projectId = searchParams.get('project_id')!
    }
    if (searchParams.get('partner_id')) {
      filters.partnerId = searchParams.get('partner_id')!
    }
    if (searchParams.get('date_from')) {
      filters.dateFrom = searchParams.get('date_from')!
    }
    if (searchParams.get('date_to')) {
      filters.dateTo = searchParams.get('date_to')!
    }
    if (searchParams.get('offset')) {
      filters.offset = parseInt(searchParams.get('offset')!, 10)
    }
    if (searchParams.get('limit')) {
      filters.limit = parseInt(searchParams.get('limit')!, 10)
    } else {
      filters.limit = 20
    }

    const supabase = await createClient()

    let query = supabase
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.projectId) {
      query = query.eq('renovation_project_id', filters.projectId)
    }
    if (filters.partnerId) {
      query = query.eq('partner_id', filters.partnerId)
    }
    if (filters.dateFrom) {
      query = query.gte('invoice_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('invoice_date', filters.dateTo)
    }

    // Order by date descending (newest first)
    query = query.order('invoice_date', { ascending: false })

    // Apply pagination
    if (filters.offset !== undefined) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit ?? 20) - 1
      )
    } else if (filters.limit !== undefined) {
      query = query.limit(filters.limit)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      invoices: data ?? [],
      total: count ?? 0,
      offset: filters.offset ?? 0,
      limit: filters.limit ?? 20
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices - Create a new invoice
 *
 * Body: CreateInvoiceInput
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

    const body: CreateInvoiceInput = await request.json()

    // Validate required fields
    if (!body.partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      )
    }
    if (!body.invoice_number) {
      return NextResponse.json(
        { error: 'invoice_number is required' },
        { status: 400 }
      )
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 }
      )
    }
    if (!body.invoice_date) {
      return NextResponse.json(
        { error: 'invoice_date is required' },
        { status: 400 }
      )
    }
    if (!body.document_storage_path) {
      return NextResponse.json(
        { error: 'document_storage_path is required (invoice PDF)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for duplicate invoice number from same partner
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('partner_id', body.partner_id)
      .eq('invoice_number', body.invoice_number)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Invoice with this number already exists from this partner' },
        { status: 409 }
      )
    }

    // Build insert data
    const insertData = {
      partner_id: body.partner_id,
      offer_id: body.offer_id ?? null,
      work_order_id: body.work_order_id ?? null,
      renovation_project_id: body.renovation_project_id ?? null,
      invoice_number: body.invoice_number,
      title: body.title ?? null,
      description: body.description ?? null,
      amount: body.amount,
      tax_rate: body.tax_rate ?? 7.7,
      line_items: body.line_items ?? [],
      invoice_date: body.invoice_date,
      due_date: body.due_date ?? null,
      document_storage_path: body.document_storage_path,
      status: 'received' as const,
      received_at: new Date().toISOString(),
      created_by: userId
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(insertData)
      .select(INVOICE_SELECT)
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
