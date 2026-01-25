'use client'

/**
 * SupplierDetail Component
 *
 * Displays supplier information with order history and stats.
 *
 * Phase 19-03: Supplier Management (SUPP-01, SUPP-07)
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrderHistoryTable } from './OrderHistoryTable'
import type { PurchaseOrder } from '@/types/suppliers'
import { formatCHF } from '@/lib/suppliers/purchase-order-queries'

interface Supplier {
  id: string
  partner_type: 'supplier'
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

interface SupplierStats {
  totalOrders: number
  totalDelivered: number
  openOrders: number
  totalAmount: number
}

interface SupplierDetailProps {
  /** Supplier ID to display */
  supplierId: string
}

/**
 * Skeleton for loading state
 */
function SupplierDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [stats, setStats] = useState<SupplierStats>({
    totalOrders: 0,
    totalDelivered: 0,
    openOrders: 0,
    totalAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch supplier data
  useEffect(() => {
    async function fetchSupplier() {
      try {
        setLoading(true)
        setError(null)

        // Fetch supplier info
        const supplierResponse = await fetch(`/api/partners/${supplierId}`)
        if (!supplierResponse.ok) {
          if (supplierResponse.status === 404) {
            throw new Error('Lieferant nicht gefunden')
          }
          throw new Error('Fehler beim Laden des Lieferanten')
        }
        const supplierData = await supplierResponse.json()
        setSupplier(supplierData.partner)

        // Fetch purchase orders for stats
        const ordersResponse = await fetch(`/api/purchase-orders?supplier_id=${supplierId}&limit=1000`)
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          const orders: PurchaseOrder[] = ordersData.purchase_orders

          // Calculate stats
          const totalOrders = orders.length
          const totalDelivered = orders.filter((o) =>
            ['delivered', 'invoiced'].includes(o.status)
          ).length
          const openOrders = orders.filter((o) =>
            ['draft', 'ordered', 'confirmed'].includes(o.status)
          ).length
          const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0)

          setStats({
            totalOrders,
            totalDelivered,
            openOrders,
            totalAmount,
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchSupplier()
  }, [supplierId])

  // Loading state
  if (loading) {
    return <SupplierDetailSkeleton />
  }

  // Error state
  if (error || !supplier) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Fehler
        </h2>
        <p className="text-red-600 dark:text-red-400">
          {error || 'Lieferant nicht gefunden'}
        </p>
        <Link
          href="/dashboard/lieferanten"
          className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
        >
          Zurueck zur Liste
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Supplier Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {supplier.company_name}
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  supplier.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {supplier.is_active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/partner?edit=${supplierId}`}>
                <Button variant="secondary" size="sm">
                  Bearbeiten
                </Button>
              </Link>
              <Link href={`/dashboard/lieferanten/bestellungen/neu?supplier_id=${supplierId}`}>
                <Button size="sm">
                  Neue Bestellung
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {supplier.contact_name && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kontaktperson</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {supplier.contact_name}
                </p>
              </div>
            )}
            {supplier.email && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <a
                  href={`mailto:${supplier.email}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.phone && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                <a
                  href={`tel:${supplier.phone}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {supplier.phone}
                </a>
              </div>
            )}
            {supplier.address && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Adresse</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-pre-line">
                  {supplier.address}
                </p>
              </div>
            )}
          </div>
          {supplier.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notizen</p>
              <p className="text-gray-700 dark:text-gray-300">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Bestellungen gesamt</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalOrders}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Geliefert</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalDelivered}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Offen</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.openOrders}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gesamtumsatz</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCHF(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Bestellhistorie
        </h3>
        <OrderHistoryTable supplierId={supplierId} limit={20} />
      </div>
    </div>
  )
}
