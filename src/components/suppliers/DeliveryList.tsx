'use client'

/**
 * DeliveryList Component
 *
 * Displays list of deliveries with filtering and invoice linking.
 *
 * Phase 19-03: Delivery Recording (SUPP-04, SUPP-05, SUPP-06)
 */

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Delivery } from '@/types/suppliers'
import { formatSwissDate } from '@/lib/suppliers/purchase-order-queries'

interface DeliveryListProps {
  /** Filter by purchase order ID */
  purchaseOrderId?: string
  /** Filter by property ID */
  propertyId?: string
  /** Callback when invoice link is requested */
  onLinkInvoice?: (delivery: Delivery) => void
  /** Refresh key to trigger reload */
  refreshKey?: number
}

/**
 * Skeleton row for loading state
 */
function DeliveryRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
      </td>
    </tr>
  )
}

export function DeliveryList({
  purchaseOrderId,
  propertyId,
  onLinkInvoice,
  refreshKey = 0,
}: DeliveryListProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  /**
   * Fetch deliveries
   */
  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (purchaseOrderId) params.set('purchase_order_id', purchaseOrderId)
      if (propertyId) params.set('property_id', propertyId)
      params.set('limit', '50')

      const response = await fetch(`/api/deliveries?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Lieferungen')
      }

      const data = await response.json()
      setDeliveries(data.deliveries)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [purchaseOrderId, propertyId])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries, refreshKey])

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchDeliveries}
          className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Empty state
  if (!loading && deliveries.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p>Keine Lieferungen vorhanden</p>
      </div>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Datum
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Lieferschein-Nr.
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Bestellt
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Erhalten
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Liegenschaft
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rechnung
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <DeliveryRowSkeleton />
                <DeliveryRowSkeleton />
                <DeliveryRowSkeleton />
              </>
            ) : (
              deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {formatSwissDate(delivery.delivery_date)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {delivery.delivery_note_number || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                    {delivery.quantity_ordered} {delivery.quantity_unit}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-sm font-medium ${
                        delivery.has_variance
                          ? delivery.quantity_received < delivery.quantity_ordered
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {delivery.quantity_received} {delivery.quantity_unit}
                      </span>
                      {delivery.has_variance && (
                        <span title={delivery.variance_note || 'Abweichung'}>
                          <svg
                            className={`w-4 h-4 ${
                              delivery.quantity_received < delivery.quantity_ordered
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {delivery.property?.name ?? '-'}
                    {delivery.building && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}/ {delivery.building.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {delivery.invoice ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {delivery.invoice.invoice_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {!delivery.invoice_id && onLinkInvoice && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onLinkInvoice(delivery)}
                      >
                        Rechnung verknuepfen
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      {total > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          {total} Lieferung{total !== 1 ? 'en' : ''}
        </div>
      )}
    </Card>
  )
}
