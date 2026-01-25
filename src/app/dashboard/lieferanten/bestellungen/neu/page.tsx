'use client'

/**
 * New Purchase Order Page
 *
 * Form for creating a new purchase order.
 *
 * Path: /dashboard/lieferanten/bestellungen/neu
 * Phase 19-03: Supplier Dashboard (SUPP-02)
 */

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PurchaseOrderForm } from '@/components/suppliers/PurchaseOrderForm'

export default function NeueBestellungPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-select supplier if provided
  const supplierId = searchParams.get('supplier_id') || undefined

  /**
   * Handle form save
   */
  function handleSave(purchaseOrder: { id: string }) {
    router.push(`/dashboard/lieferanten/bestellungen/${purchaseOrder.id}`)
  }

  /**
   * Handle form cancel
   */
  function handleCancel() {
    router.back()
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
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
        <span className="text-gray-900 dark:text-gray-100">Neu</span>
      </nav>

      {/* Purchase Order Form */}
      <PurchaseOrderForm
        supplierId={supplierId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
