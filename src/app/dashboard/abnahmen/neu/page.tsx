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
import { InspectionForm } from '@/components/inspections/InspectionForm'

export default function NeueAbnahmePage() {
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
          href="/dashboard/abnahmen"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Abnahmen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Neu</span>
      </nav>

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
