'use client'

/**
 * Purchase Orders List Page
 *
 * Displays all purchase orders with status filters.
 *
 * Path: /dashboard/lieferanten/bestellungen
 * Phase 19-03: Supplier Dashboard (SUPP-02, SUPP-03)
 */

import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Button } from '@/components/ui/button'
import { PurchaseOrderList } from '@/components/suppliers/PurchaseOrderList'

export default function BestellungenPage() {
  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bestellungen
          </h1>
          <Link href="/dashboard/lieferanten/bestellungen/neu">
            <Button>
              Neue Bestellung
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Alle Bestellungen bei Lieferanten verwalten
        </p>
      </div>

      {/* Purchase Order List */}
      <PurchaseOrderList />
    </div>
  )
}
