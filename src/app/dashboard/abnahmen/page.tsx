'use client'

/**
 * Inspections List Page
 *
 * Displays all inspections with filters and status badges.
 *
 * Path: /dashboard/abnahmen
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Button } from '@/components/ui/button'
import { InspectionList } from '@/components/inspections/InspectionList'
import type { Inspection } from '@/types/inspections'

export default function AbnahmenPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const res = await fetch('/api/inspections')
        if (!res.ok) {
          throw new Error('Failed to fetch inspections')
        }
        const data = await res.json()
        setInspections(data.inspections || [])
      } catch (err) {
        console.error('Error fetching inspections:', err)
        setError(err instanceof Error ? err.message : 'Failed to load inspections')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInspections()
  }, [])

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Abnahmen
          </h1>
          <Link href="/dashboard/abnahmen/neu">
            <Button>Neue Abnahme</Button>
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Alle Abnahmen und Mängel verwalten
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Laden...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      ) : (
        <InspectionList inspections={inspections} />
      )}
    </div>
  )
}
