/**
 * Invoice Query Utilities
 *
 * Functions for fetching invoices with relations and aggregations.
 * Used by API routes and server components.
 */

import { createClient } from '@/lib/supabase/server'
import type { Invoice, Partner, Offer, WorkOrder, RenovationProject } from '@/types/database'

/**
 * Invoice with all related entities
 */
export interface InvoiceWithRelations extends Invoice {
  partner: Pick<Partner, 'id' | 'company_name' | 'contact_name' | 'email' | 'phone'> | null
  offer: Pick<Offer, 'id' | 'title' | 'total_amount' | 'status'> | null
  work_order: Pick<WorkOrder, 'id' | 'title' | 'status'> | null
  project: Pick<RenovationProject, 'id' | 'name' | 'status'> | null
}

/**
 * Select query for invoices with relations
 */
export const INVOICE_SELECT = `
  *,
  partner:partners (
    id,
    company_name,
    contact_name,
    email,
    phone
  ),
  offer:offers (
    id,
    title,
    total_amount,
    status
  ),
  work_order:work_orders (
    id,
    title,
    status
  ),
  project:renovation_projects (
    id,
    name,
    status
  )
`

/**
 * Get a single invoice with all relations
 */
export async function getInvoiceWithRelations(
  id: string
): Promise<InvoiceWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Error fetching invoice:', error)
    return null
  }

  return data as InvoiceWithRelations
}

/**
 * Filter options for invoice queries
 */
export interface InvoiceFilters {
  status?: string
  projectId?: string
  partnerId?: string
  dateFrom?: string
  dateTo?: string
  offset?: number
  limit?: number
}

/**
 * Get invoices by filters with pagination
 */
export async function getInvoicesByFilters(
  filters: InvoiceFilters = {}
): Promise<{ invoices: InvoiceWithRelations[]; total: number }> {
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
    return { invoices: [], total: 0 }
  }

  return {
    invoices: (data ?? []) as InvoiceWithRelations[],
    total: count ?? 0
  }
}

/**
 * Get invoices by status
 */
export async function getInvoicesByStatus(
  status: string,
  limit = 50
): Promise<InvoiceWithRelations[]> {
  const { invoices } = await getInvoicesByFilters({ status, limit })
  return invoices
}

/**
 * Get all invoices for a project
 */
export async function getInvoicesByProject(
  projectId: string
): Promise<InvoiceWithRelations[]> {
  const { invoices } = await getInvoicesByFilters({ projectId })
  return invoices
}

/**
 * Invoice status counts for dashboard
 */
export interface InvoiceStatusCounts {
  received: number
  under_review: number
  approved: number
  disputed: number
  paid: number
  total: number
}

/**
 * Get invoice counts by status
 */
export async function getInvoiceStatusCounts(): Promise<InvoiceStatusCounts> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('status')

  if (error || !data) {
    console.error('Error fetching invoice counts:', error)
    return {
      received: 0,
      under_review: 0,
      approved: 0,
      disputed: 0,
      paid: 0,
      total: 0
    }
  }

  const counts: InvoiceStatusCounts = {
    received: 0,
    under_review: 0,
    approved: 0,
    disputed: 0,
    paid: 0,
    total: data.length
  }

  for (const invoice of data) {
    const status = invoice.status as keyof Omit<InvoiceStatusCounts, 'total'>
    if (status in counts) {
      counts[status]++
    }
  }

  return counts
}

/**
 * Format CHF currency for display
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount)
}

/**
 * Format date for Swiss display (DD.MM.YYYY)
 */
export function formatSwissDate(date: string | Date | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Get invoice status display text (German)
 */
export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Erhalten',
    under_review: 'In Pruefung',
    approved: 'Freigegeben',
    disputed: 'Beanstandet',
    partially_paid: 'Teilweise bezahlt',
    paid: 'Bezahlt',
    cancelled: 'Storniert'
  }
  return labels[status] ?? status
}

/**
 * Get status badge color class
 */
export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    partially_paid: 'bg-orange-100 text-orange-800',
    paid: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-500'
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}
