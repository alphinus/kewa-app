/**
 * Cost Export API Route
 *
 * POST /api/costs/export - Generate CSV export for accounting
 *
 * Exports invoices and/or expenses with configurable filters.
 * Returns Swiss-formatted CSV file with:
 * - Semicolon delimiter (Excel German default)
 * - UTF-8 BOM for Excel compatibility
 * - DD.MM.YYYY dates
 * - Comma decimal separator
 *
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import {
  type ExportRequest,
  type ExportRow,
  mapInvoiceToExportRow,
  mapExpenseToExportRow,
  sortExportRowsByDate,
  generateCSV,
  addUTF8BOM,
  generateExportFilename,
} from '@/lib/costs/csv-export'

// Internal roles that can export cost data
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * POST /api/costs/export - Generate and download CSV
 *
 * Body:
 * - type: 'invoices' | 'expenses' | 'all'
 * - projectId?: string - Filter by project
 * - dateFrom?: string - Filter by min date (YYYY-MM-DD)
 * - dateTo?: string - Filter by max date (YYYY-MM-DD)
 * - status?: string[] - Filter invoices by status
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

    // Only internal roles can export cost data
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: ExportRequest = await request.json()
    const { type, projectId, dateFrom, dateTo, status } = body

    // Validate export type
    if (!type || !['invoices', 'expenses', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid export type. Must be: invoices, expenses, or all' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const rows: ExportRow[] = []

    // ========================================
    // FETCH INVOICES
    // ========================================
    if (type === 'invoices' || type === 'all') {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          amount,
          tax_amount,
          total_amount,
          status,
          paid_at,
          partner:partners!invoices_partner_id_fkey(company_name),
          project:renovation_projects!invoices_renovation_project_id_fkey(name)
        `)
        .order('invoice_date', { ascending: false })

      // Apply filters
      if (projectId) {
        query = query.eq('renovation_project_id', projectId)
      }
      if (dateFrom) {
        query = query.gte('invoice_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('invoice_date', dateTo)
      }
      if (status && status.length > 0) {
        query = query.in('status', status)
      }

      const { data: invoices, error: invoiceError } = await query

      if (invoiceError) {
        console.error('Error fetching invoices for export:', invoiceError)
        return NextResponse.json(
          { error: `Failed to fetch invoices: ${invoiceError.message}` },
          { status: 500 }
        )
      }

      // Map invoices to export rows
      if (invoices) {
        for (const invoice of invoices) {
          // Handle Supabase relation format (may be array or object)
          const partnerData = Array.isArray(invoice.partner)
            ? invoice.partner[0]
            : invoice.partner
          const projectData = Array.isArray(invoice.project)
            ? invoice.project[0]
            : invoice.project

          rows.push(mapInvoiceToExportRow({
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            amount: invoice.amount,
            tax_amount: invoice.tax_amount,
            total_amount: invoice.total_amount,
            status: invoice.status,
            paid_at: invoice.paid_at,
            partner: partnerData as { company_name: string } | null,
            project: projectData as { name: string } | null,
          }))
        }
      }
    }

    // ========================================
    // FETCH EXPENSES
    // ========================================
    if (type === 'expenses' || type === 'all') {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          receipt_number,
          paid_at,
          amount,
          vendor_name,
          category,
          project:renovation_projects!expenses_renovation_project_id_fkey(name)
        `)
        .order('paid_at', { ascending: false })

      // Apply filters
      if (projectId) {
        query = query.eq('renovation_project_id', projectId)
      }
      if (dateFrom) {
        query = query.gte('paid_at', dateFrom)
      }
      if (dateTo) {
        // Add time to include full day
        query = query.lte('paid_at', `${dateTo}T23:59:59.999Z`)
      }

      const { data: expenses, error: expenseError } = await query

      if (expenseError) {
        console.error('Error fetching expenses for export:', expenseError)
        return NextResponse.json(
          { error: `Failed to fetch expenses: ${expenseError.message}` },
          { status: 500 }
        )
      }

      // Map expenses to export rows
      if (expenses) {
        for (const expense of expenses) {
          // Handle Supabase relation format
          const projectData = Array.isArray(expense.project)
            ? expense.project[0]
            : expense.project

          rows.push(mapExpenseToExportRow({
            receipt_number: expense.receipt_number,
            paid_at: expense.paid_at,
            amount: expense.amount,
            vendor_name: expense.vendor_name,
            category: expense.category,
            project: projectData as { name: string } | null,
          }))
        }
      }
    }

    // ========================================
    // GENERATE CSV
    // ========================================

    // Sort all rows by date descending
    const sortedRows = sortExportRowsByDate(rows)

    // Generate CSV with Swiss formatting
    const csv = generateCSV(sortedRows)

    // Add UTF-8 BOM for Excel compatibility
    const csvWithBom = addUTF8BOM(csv)

    // Generate filename
    const filename = generateExportFilename(type)

    // Return CSV file as download
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/costs/export:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/costs/export/preview - Preview export row count
 *
 * Same filters as POST but returns count only.
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const projectId = searchParams.get('projectId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const statusParam = searchParams.get('status')
    const status = statusParam ? statusParam.split(',') : undefined

    const supabase = await createClient()
    let invoiceCount = 0
    let expenseCount = 0

    // Count invoices
    if (type === 'invoices' || type === 'all') {
      let query = supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })

      if (projectId) query = query.eq('renovation_project_id', projectId)
      if (dateFrom) query = query.gte('invoice_date', dateFrom)
      if (dateTo) query = query.lte('invoice_date', dateTo)
      if (status && status.length > 0) query = query.in('status', status)

      const { count } = await query
      invoiceCount = count ?? 0
    }

    // Count expenses
    if (type === 'expenses' || type === 'all') {
      let query = supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })

      if (projectId) query = query.eq('renovation_project_id', projectId)
      if (dateFrom) query = query.gte('paid_at', dateFrom)
      if (dateTo) query = query.lte('paid_at', `${dateTo}T23:59:59.999Z`)

      const { count } = await query
      expenseCount = count ?? 0
    }

    return NextResponse.json({
      type,
      invoiceCount,
      expenseCount,
      totalCount: invoiceCount + expenseCount,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/costs/export:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
