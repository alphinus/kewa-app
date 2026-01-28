'use client'

/**
 * ChangeOrderList Component
 *
 * Displays list of change orders with status filters and pagination.
 *
 * Phase 21-02: Approval Workflow
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge'
import type { ChangeOrderStatus } from '@/types/change-orders'
import { CHANGE_ORDER_STATUS_OPTIONS } from '@/lib/change-orders/workflow'
import { formatCHF, formatSwissDate } from '@/lib/change-orders/queries'

interface WorkOrder {
  id: string
  wo_number: string
  title: string
}

interface ChangeOrder {
  id: string
  co_number: string
  work_order_id: string
  description: string
  status: ChangeOrderStatus
  total_amount: number
  created_at: string
  work_order: WorkOrder | null
}

interface ChangeOrderListProps {
  /** Pre-filter by work order ID */
  workOrderId?: string
  /** Base URL for detail navigation (default: /dashboard/aenderungsauftraege) */
  detailBaseUrl?: string
}

/**
 * Skeleton row for loading state
 */
function ChangeOrderRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-4">
        <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </td>
    </tr>
  )
}

export function ChangeOrderList({
  workOrderId: initialWorkOrderId,
  detailBaseUrl = '/dashboard/aenderungsauftraege',
}: ChangeOrderListProps) {
  const router = useRouter()
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Filters
  const [status, setStatus] = useState<ChangeOrderStatus | ''>('')

  // Pagination
  const [offset, setOffset] = useState(0)
  const limit = 20

  /**
   * Fetch change orders with current filters
   */
  const fetchChangeOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (initialWorkOrderId) params.set('work_order_id', initialWorkOrderId)
      params.set('offset', String(offset))
      params.set('limit', String(limit))

      const res = await fetch(`/api/change-orders?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Fehler beim Laden der Änderungsaufträge')
      }

      const data = await res.json()
      setChangeOrders(data.change_orders)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [status, initialWorkOrderId, offset])

  useEffect(() => {
    fetchChangeOrders()
  }, [fetchChangeOrders])

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [status])

  /**
   * Navigate to change order detail
   */
  const handleRowClick = (changeOrder: ChangeOrder) => {
    router.push(`${detailBaseUrl}/${changeOrder.id}`)
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ChangeOrderStatus | '')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHANGE_ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-end">
              <span className="text-sm text-gray-500">
                {total} Änderungsauftrag{total !== 1 ? 'träge' : ''} gefunden
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchChangeOrders}
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
                  CO-Nr.
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arbeitsauftrag
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <ChangeOrderRowSkeleton />
                  <ChangeOrderRowSkeleton />
                  <ChangeOrderRowSkeleton />
                  <ChangeOrderRowSkeleton />
                  <ChangeOrderRowSkeleton />
                </>
              ) : changeOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Keine Änderungsaufträge gefunden
                  </td>
                </tr>
              ) : (
                changeOrders.map((co) => (
                  <tr
                    key={co.id}
                    onClick={() => handleRowClick(co)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-blue-600">
                      {co.co_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {co.work_order?.wo_number ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {co.description.length > 60
                        ? `${co.description.slice(0, 60)}...`
                        : co.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      <span
                        className={
                          co.total_amount < 0
                            ? 'text-red-600'
                            : co.total_amount > 0
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }
                      >
                        {co.total_amount < 0 ? '' : '+'}
                        {formatCHF(co.total_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ChangeOrderStatusBadge status={co.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatSwissDate(co.created_at)}
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
                Zurück
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
