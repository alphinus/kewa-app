'use client'

/**
 * Create Inspection Page
 *
 * Form to create a new inspection with template selection.
 *
 * Path: /dashboard/abnahmen/neu
 * Phase 22-02: Inspection UI
 */

import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { InspectionForm } from '@/components/inspections/InspectionForm'

export default function NeueAbnahmePage() {
  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Neue Abnahme
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Abnahme erstellen und Checkliste ausführen
        </p>
      </div>

      {/* Form */}
      <InspectionForm />
    </div>
  )
}
