'use client'

/**
 * Change Orders List Page
 *
 * Displays all change orders with status filters.
 *
 * Path: /dashboard/aenderungsauftraege
 * Phase 21-02: Approval Workflow
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChangeOrderList } from '@/components/change-orders/ChangeOrderList'

export default function AenderungsauftraegePage() {
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
        <span className="text-gray-900 dark:text-gray-100">
          Änderungsaufträge
        </span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Änderungsaufträge
          </h1>
          <Link href="/dashboard/aenderungsauftraege/neu">
            <Button>Neuer Änderungsauftrag</Button>
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Alle Änderungsaufträge verwalten und genehmigen
        </p>
      </div>

      {/* Change Order List */}
      <ChangeOrderList />
    </div>
  )
}
