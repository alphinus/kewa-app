'use client'

/**
 * PurchaseOrderList Component
 *
 * Displays list of purchase orders with status filters and pagination.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge'
import {
  type PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_OPTIONS,
} from '@/lib/suppliers/status-utils'
import { formatCHF, formatSwissDate } from '@/lib/suppliers/purchase-order-queries'

interface Supplier {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  status: PurchaseOrderStatus
  line_items: unknown[]
  total_amount: number
  expected_delivery_date: string | null
  created_at: string
  supplier: Supplier | null
}

interface PurchaseOrderListProps {
  /** Pre-filter by supplier ID */
  supplierId?: string
  /** Base URL for detail navigation (default: /dashboard/lieferanten/bestellungen) */
  detailBaseUrl?: string
}

/**
 * Skeleton row for loading state
 */
function PurchaseOrderRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse" />
      </td>
    </tr>
  )
}

export function PurchaseOrderList({
  supplierId: initialSupplierId,
  detailBaseUrl = '/dashboard/lieferanten/bestellungen',
}: PurchaseOrderListProps) {
  const router = useRouter()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // Filters
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('')

  // Pagination
  const [offset, setOffset] = useState(0)
  const limit = 20

  /**
   * Fetch purchase orders with current filters
   */
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (initialSupplierId) params.set('supplier_id', initialSupplierId)
      params.set('offset', String(offset))
      params.set('limit', String(limit))

      const res = await fetch(`/api/purchase-orders?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Fehler beim Laden der Bestellungen')
      }

      const data = await res.json()
      setPurchaseOrders(data.purchase_orders)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [status, initialSupplierId, offset])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [fetchPurchaseOrders])

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [status])

  /**
   * Navigate to purchase order detail
   */
  const handleRowClick = (purchaseOrder: PurchaseOrder) => {
    router.push(`${detailBaseUrl}/${purchaseOrder.id}`)
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
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PURCHASE_ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-end">
              <span className="text-sm text-gray-500">
                {total} Bestellung{total !== 1 ? 'en' : ''} gefunden
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
            onClick={fetchPurchaseOrders}
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
                  Bestellung-Nr.
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lieferant
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lieferdatum
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <PurchaseOrderRowSkeleton />
                  <PurchaseOrderRowSkeleton />
                  <PurchaseOrderRowSkeleton />
                  <PurchaseOrderRowSkeleton />
                  <PurchaseOrderRowSkeleton />
                </>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Keine Bestellungen gefunden
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => handleRowClick(po)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-blue-600">
                      {po.order_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {po.supplier?.company_name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatCHF(po.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatSwissDate(po.expected_delivery_date)}
                    </td>
                    <td className="py-3 px-4">
                      <PurchaseOrderStatusBadge status={po.status} size="sm" />
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
