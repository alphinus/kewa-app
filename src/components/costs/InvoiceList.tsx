'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatCHF,
  formatSwissDate,
  getInvoiceStatusLabel,
  getInvoiceStatusColor
} from '@/lib/costs/invoice-constants'
import type { InvoiceWithRelations } from '@/lib/costs/invoice-queries'

/**
 * Status filter options
 */
const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'received', label: 'Erhalten' },
  { value: 'under_review', label: 'In Pruefung' },
  { value: 'approved', label: 'Freigegeben' },
  { value: 'disputed', label: 'Beanstandet' },
  { value: 'paid', label: 'Bezahlt' }
]

interface InvoiceListProps {
  /** Pre-filter by project */
  projectId?: string
  /** Pre-filter by partner */
  partnerId?: string
  /** Available projects for filter dropdown */
  projects?: Array<{ id: string; name: string }>
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getInvoiceStatusColor(status)
      )}
    >
      {getInvoiceStatusLabel(status)}
    </span>
  )
}

/**
 * Skeleton row for loading state
 */
function InvoiceRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-4">
        <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse" />
      </td>
    </tr>
  )
}

/**
 * Invoice list with filters and pagination
 */
export function InvoiceList({
  projectId: initialProjectId,
  partnerId: initialPartnerId,
  projects = []
}: InvoiceListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Filters
  const [status, setStatus] = useState('')
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [offset, setOffset] = useState(0)
  const limit = 20

  /**
   * Fetch invoices with current filters
   */
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (projectId) params.set('project_id', projectId)
      if (initialPartnerId) params.set('partner_id', initialPartnerId)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('offset', String(offset))
      params.set('limit', String(limit))

      const res = await fetch(`/api/invoices?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Fehler beim Laden der Rechnungen')
      }

      const data = await res.json()
      setInvoices(data.invoices)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [status, projectId, initialPartnerId, dateFrom, dateTo, offset])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [status, projectId, dateFrom, dateTo])

  /**
   * Navigate to invoice detail
   */
  const handleRowClick = (invoice: InvoiceWithRelations) => {
    router.push(`/dashboard/kosten/rechnungen/${invoice.id}`)
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project filter (only show if projects provided and no fixed projectId) */}
            {!initialProjectId && projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle Projekte</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date from */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bis
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchInvoices}
            className="mt-2 text-sm text-red-700 underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nr.
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projekt
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                </>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-500"
                  >
                    Keine Rechnungen gefunden
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => handleRowClick(invoice)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatSwissDate(invoice.invoice_date)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {invoice.partner?.company_name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {invoice.project?.name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatCHF(invoice.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {offset + 1} - {Math.min(offset + limit, total)} von {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Zurueck
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Seite {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
