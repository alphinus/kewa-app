'use client'

/**
 * Purchase Order Detail Page
 *
 * Displays purchase order details with delivery recording.
 *
 * Path: /dashboard/lieferanten/bestellungen/[id]
 * Phase 19-03: Supplier Dashboard (SUPP-03, SUPP-04, SUPP-05, SUPP-06)
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PurchaseOrderStatusBadge } from '@/components/suppliers/PurchaseOrderStatusBadge'
import { DeliveryForm } from '@/components/suppliers/DeliveryForm'
import { DeliveryList } from '@/components/suppliers/DeliveryList'
import { InvoiceLinkModal } from '@/components/suppliers/InvoiceLinkModal'
import {
  type PurchaseOrderStatus,
  getNextActions,
  getPurchaseOrderStatusLabel,
} from '@/lib/suppliers/status-utils'
import {
  formatCHF,
  formatSwissDate,
  type PurchaseOrderLineItem,
} from '@/lib/suppliers/purchase-order-queries'
import type { PurchaseOrder, Delivery, CreateDeliveryInput } from '@/types/suppliers'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get action button config for status transitions
 */
function getStatusActionConfig(status: PurchaseOrderStatus): {
  nextStatus: PurchaseOrderStatus
  label: string
  variant: 'primary' | 'secondary'
}[] {
  const nextActions = getNextActions(status)
  return nextActions.map((nextStatus) => {
    switch (nextStatus) {
      case 'ordered':
        return { nextStatus, label: 'Als bestellt markieren', variant: 'primary' as const }
      case 'confirmed':
        return { nextStatus, label: 'Bestätigung erfassen', variant: 'primary' as const }
      case 'delivered':
        return { nextStatus, label: 'Als geliefert markieren', variant: 'primary' as const }
      case 'invoiced':
        return { nextStatus, label: 'Rechnung verknüpft', variant: 'primary' as const }
      case 'cancelled':
        return { nextStatus, label: 'Stornieren', variant: 'secondary' as const }
      default:
        return { nextStatus, label: getPurchaseOrderStatusLabel(nextStatus), variant: 'secondary' as const }
    }
  })
}

/**
 * Loading skeleton
 */
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <Card>
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BestellungDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [deliveryRefreshKey, setDeliveryRefreshKey] = useState(0)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [linkDelivery, setLinkDelivery] = useState<Delivery | null>(null)

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isValidId = uuidRegex.test(id)

  // Fetch purchase order
  useEffect(() => {
    if (!isValidId) return

    async function fetchPurchaseOrder() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/purchase-orders/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Bestellung nicht gefunden')
          }
          throw new Error('Fehler beim Laden der Bestellung')
        }

        const data = await response.json()
        setPurchaseOrder(data.purchase_order)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrder()
  }, [id, isValidId])

  /**
   * Handle status transition
   */
  async function handleStatusTransition(newStatus: PurchaseOrderStatus) {
    if (!purchaseOrder) return

    try {
      setStatusUpdating(true)

      const response = await fetch(`/api/purchase-orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Statusänderung fehlgeschlagen')
      }

      const data = await response.json()
      setPurchaseOrder(data.purchase_order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setStatusUpdating(false)
    }
  }

  /**
   * Handle delivery save
   */
  async function handleDeliverySave(deliveryData: CreateDeliveryInput) {
    const response = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveryData),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Lieferung konnte nicht erfasst werden')
    }

    // Refresh the page data
    setShowDeliveryForm(false)
    setDeliveryRefreshKey((k) => k + 1)

    // Update purchase order status if changed
    const orderResponse = await fetch(`/api/purchase-orders/${id}`)
    if (orderResponse.ok) {
      const data = await orderResponse.json()
      setPurchaseOrder(data.purchase_order)
    }
  }

  /**
   * Handle invoice link request
   */
  function handleLinkInvoice(delivery: Delivery) {
    setLinkDelivery(delivery)
  }

  /**
   * Handle successful invoice link
   */
  async function handleInvoiceLinked() {
    // Refresh deliveries and purchase order
    setDeliveryRefreshKey((k) => k + 1)

    const orderResponse = await fetch(`/api/purchase-orders/${id}`)
    if (orderResponse.ok) {
      const data = await orderResponse.json()
      setPurchaseOrder(data.purchase_order)
    }
  }

  // Invalid ID
  if (!isValidId) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">Ungültiges ID-Format</p>
          <Link
            href="/dashboard/lieferanten/bestellungen"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <DetailSkeleton />
      </div>
    )
  }

  // Error
  if (error || !purchaseOrder) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">
            {error || 'Bestellung nicht gefunden'}
          </p>
          <Link
            href="/dashboard/lieferanten/bestellungen"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>
    )
  }

  const statusActions = getStatusActionConfig(purchaseOrder.status)
  const canRecordDelivery = purchaseOrder.status === 'confirmed'
  const lineItems = purchaseOrder.line_items as PurchaseOrderLineItem[]

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/lieferanten"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Lieferanten
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/lieferanten/bestellungen"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Bestellungen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{purchaseOrder.order_number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {purchaseOrder.order_number}
          </h1>
          <PurchaseOrderStatusBadge status={purchaseOrder.status} />
        </div>
      </div>

      {/* Status Actions */}
      {statusActions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Aktionen
            </h2>
            <div className="flex flex-wrap gap-2">
              {statusActions.map((action) => (
                <Button
                  key={action.nextStatus}
                  variant={action.variant === 'primary' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleStatusTransition(action.nextStatus)}
                  disabled={statusUpdating}
                >
                  {action.label}
                </Button>
              ))}
              {canRecordDelivery && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDeliveryForm(true)}
                >
                  Lieferung erfassen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Bestelldetails
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lieferant</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {purchaseOrder.supplier?.company_name ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Erstellt am</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatSwissDate(purchaseOrder.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Erwartete Lieferung</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatSwissDate(purchaseOrder.expected_delivery_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gesamtbetrag</p>
              <p className="font-medium text-blue-600 dark:text-blue-400 text-lg">
                {formatCHF(purchaseOrder.total_amount)}
              </p>
            </div>
          </div>

          {purchaseOrder.notes && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bemerkungen</p>
              <p className="text-gray-700 dark:text-gray-300">{purchaseOrder.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Positionen
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Beschreibung
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Menge
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Einheit
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Stueckpreis
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {item.unit}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                    {formatCHF(item.unit_price)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                    {formatCHF(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td colSpan={4} className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                  Gesamtbetrag
                </td>
                <td className="py-3 px-4 text-lg font-bold text-blue-600 dark:text-blue-400 text-right">
                  {formatCHF(purchaseOrder.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Deliveries Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Lieferungen
          </h2>
          {canRecordDelivery && (
            <Button size="sm" onClick={() => setShowDeliveryForm(true)}>
              Lieferung erfassen
            </Button>
          )}
        </div>
        <DeliveryList
          purchaseOrderId={id}
          onLinkInvoice={handleLinkInvoice}
          refreshKey={deliveryRefreshKey}
        />
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Statusverlauf
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Erstellt:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatSwissDate(purchaseOrder.created_at)}
              </span>
            </div>
            {purchaseOrder.ordered_at && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Bestellt:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatSwissDate(purchaseOrder.ordered_at)}
                </span>
              </div>
            )}
            {purchaseOrder.confirmed_at && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Bestätigt:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatSwissDate(purchaseOrder.confirmed_at)}
                </span>
              </div>
            )}
            {purchaseOrder.delivered_at && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Geliefert:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatSwissDate(purchaseOrder.delivered_at)}
                </span>
              </div>
            )}
            {purchaseOrder.invoiced_at && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Verrechnet:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatSwissDate(purchaseOrder.invoiced_at)}
                </span>
              </div>
            )}
            {purchaseOrder.cancelled_at && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Storniert:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatSwissDate(purchaseOrder.cancelled_at)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/lieferanten/bestellungen"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zur Liste
        </Link>
      </div>

      {/* Delivery Form Dialog */}
      {showDeliveryForm && (
        <DeliveryForm
          purchaseOrder={purchaseOrder}
          onSave={handleDeliverySave}
          onCancel={() => setShowDeliveryForm(false)}
        />
      )}

      {/* Invoice Link Modal */}
      {linkDelivery && purchaseOrder && (
        <InvoiceLinkModal
          open={linkDelivery !== null}
          onOpenChange={(open) => !open && setLinkDelivery(null)}
          delivery={linkDelivery}
          supplierId={purchaseOrder.supplier?.id || ''}
          onLinked={handleInvoiceLinked}
        />
      )}
    </div>
  )
}
