'use client'

/**
 * OrderHistoryTable Component
 *
 * Displays purchase order history per supplier or property with expandable delivery details.
 *
 * Phase 19-03: Order History (SUPP-07)
 */

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge'
import type { PurchaseOrder } from '@/types/suppliers'
import { formatCHF, formatSwissDate } from '@/lib/suppliers/purchase-order-queries'

interface OrderHistoryTableProps {
  /** Filter by supplier ID */
  supplierId?: string
  /** Filter by property ID */
  propertyId?: string
  /** Limit number of results */
  limit?: number
  /** Show supplier column (for property view) */
  showSupplier?: boolean
  /** Callback when row is clicked */
  onRowClick?: (order: PurchaseOrder) => void
}

interface PurchaseOrderWithDeliveries extends PurchaseOrder {
  deliveries?: Array<{
    id: string
    delivery_date: string
    delivery_note_number: string | null
    quantity_ordered: number
    quantity_received: number
    quantity_unit: string
    has_variance: boolean
    property?: { id: string; name: string }
  }>
}

/**
 * Skeleton row for loading state
 */
function OrderRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
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

export function OrderHistoryTable({
  supplierId,
  propertyId,
  limit = 50,
  showSupplier = false,
  onRowClick,
}: OrderHistoryTableProps) {
  const [orders, setOrders] = useState<PurchaseOrderWithDeliveries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  /**
   * Toggle row expansion
   */
  const toggleRow = (orderId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  /**
   * Fetch purchase orders
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (supplierId) params.set('supplier_id', supplierId)
      params.set('limit', String(limit))

      const response = await fetch(`/api/purchase-orders?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Bestellungen')
      }

      const data = await response.json()
      let orderList: PurchaseOrderWithDeliveries[] = data.purchase_orders

      // If property filter, we need to fetch deliveries and filter
      if (propertyId) {
        // Fetch deliveries for this property
        const deliveriesResponse = await fetch(`/api/deliveries?property_id=${propertyId}&limit=200`)
        if (deliveriesResponse.ok) {
          const deliveriesData = await deliveriesResponse.json()
          const deliveries = deliveriesData.deliveries

          // Get unique purchase order IDs from deliveries
          const poIdsWithDeliveries = new Set(
            deliveries.map((d: { purchase_order_id: string }) => d.purchase_order_id)
          )

          // Filter orders and attach deliveries
          orderList = orderList
            .filter((order) => poIdsWithDeliveries.has(order.id))
            .map((order) => ({
              ...order,
              deliveries: deliveries.filter(
                (d: { purchase_order_id: string }) => d.purchase_order_id === order.id
              ),
            }))
        }
      } else if (supplierId) {
        // Fetch deliveries for each order to show delivery info
        const ordersWithDeliveries = await Promise.all(
          orderList.map(async (order) => {
            try {
              const response = await fetch(`/api/deliveries?purchase_order_id=${order.id}`)
              if (response.ok) {
                const data = await response.json()
                return { ...order, deliveries: data.deliveries }
              }
            } catch {
              // Ignore errors for individual delivery fetches
            }
            return order
          })
        )
        orderList = ordersWithDeliveries
      }

      setOrders(orderList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [supplierId, propertyId, limit])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Empty state
  if (!loading && orders.length === 0) {
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p>Keine Bestellungen vorhanden</p>
      </div>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                {/* Expand toggle */}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Bestellung
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Datum
              </th>
              {showSupplier && (
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lieferant
                </th>
              )}
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Betrag
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Lieferung
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <OrderRowSkeleton />
                <OrderRowSkeleton />
                <OrderRowSkeleton />
              </>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedRows.has(order.id)
                const hasDeliveries = (order.deliveries?.length ?? 0) > 0
                const lastDelivery = order.deliveries?.[0]

                return (
                  <>
                    <tr
                      key={order.id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onRowClick?.(order)}
                    >
                      <td className="py-3 px-4">
                        {hasDeliveries && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRow(order.id)
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                        {order.order_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatSwissDate(order.created_at)}
                      </td>
                      {showSupplier && (
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {order.supplier?.company_name ?? '-'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                        {formatCHF(order.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <PurchaseOrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {lastDelivery
                          ? formatSwissDate(lastDelivery.delivery_date)
                          : order.expected_delivery_date
                            ? `Erwartet: ${formatSwissDate(order.expected_delivery_date)}`
                            : '-'}
                      </td>
                    </tr>

                    {/* Expanded delivery details */}
                    {isExpanded && order.deliveries && (
                      <tr key={`${order.id}-expanded`}>
                        <td colSpan={showSupplier ? 7 : 6} className="p-0">
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              Lieferungen ({order.deliveries.length})
                            </h4>
                            <table className="w-full">
                              <thead>
                                <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                  <th className="py-2 text-left">Datum</th>
                                  <th className="py-2 text-left">Lieferschein</th>
                                  <th className="py-2 text-right">Bestellt</th>
                                  <th className="py-2 text-right">Erhalten</th>
                                  <th className="py-2 text-left">Liegenschaft</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.deliveries.map((delivery) => (
                                  <tr
                                    key={delivery.id}
                                    className="text-sm text-gray-600 dark:text-gray-400"
                                  >
                                    <td className="py-2">
                                      {formatSwissDate(delivery.delivery_date)}
                                    </td>
                                    <td className="py-2">
                                      {delivery.delivery_note_number || '-'}
                                    </td>
                                    <td className="py-2 text-right">
                                      {delivery.quantity_ordered} {delivery.quantity_unit}
                                    </td>
                                    <td className="py-2 text-right">
                                      <span
                                        className={
                                          delivery.has_variance
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : ''
                                        }
                                      >
                                        {delivery.quantity_received} {delivery.quantity_unit}
                                        {delivery.has_variance && ' *'}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      {delivery.property?.name ?? '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
