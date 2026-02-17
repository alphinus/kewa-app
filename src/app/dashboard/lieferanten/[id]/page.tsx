'use client'

/**
 * Supplier Detail Page
 *
 * Displays supplier information with order history.
 *
 * Path: /dashboard/lieferanten/[id]
 * Phase 19-03: Supplier Dashboard (SUPP-01, SUPP-07)
 */

import { use } from 'react'
import Link from 'next/link'
import { SupplierDetail } from '@/components/suppliers/SupplierDetail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function LieferantDetailPage({ params }: PageProps) {
  const { id } = use(params)

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">
            Ungültiges ID-Format
          </p>
          <Link
            href="/dashboard/lieferanten"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
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
        <span className="text-gray-900 dark:text-gray-100">Details</span>
      </nav>

      {/* Supplier Detail Component */}
      <SupplierDetail supplierId={id} />
    </div>
  )
}
