'use client'

/**
 * InspectionList Component
 *
 * Displays a filterable list of inspections with status badges.
 *
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Inspection, InspectionStatus } from '@/types/inspections'
import { InspectionStatusBadge } from './InspectionStatusBadge'

interface InspectionListProps {
  inspections: Inspection[]
}

export function InspectionList({ inspections }: InspectionListProps) {
  const [filteredInspections, setFilteredInspections] = useState(inspections)
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let filtered = inspections

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter)
    }

    // Filter by search query (title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((i) =>
        i.title.toLowerCase().includes(query)
      )
    }

    setFilteredInspections(filtered)
  }, [inspections, statusFilter, searchQuery])

  // Format date as Swiss German
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | 'all')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">Alle Status</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="signed">Unterschrieben</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Titel suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {filteredInspections.length} {filteredInspections.length === 1 ? 'Abnahme' : 'Abnahmen'}
      </p>

      {/* Inspection cards */}
      {filteredInspections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Abnahmen gefunden
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInspections.map((inspection) => (
            <Link
              key={inspection.id}
              href={`/dashboard/abnahmen/${inspection.id}`}
              className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {inspection.title}
                  </h3>
                  {inspection.work_order && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Auftrag: {inspection.work_order.wo_number} - {inspection.work_order.title}
                    </p>
                  )}
                  {inspection.project && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Projekt: {inspection.project.name}
                    </p>
                  )}
                </div>
                <InspectionStatusBadge status={inspection.status} />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Datum: {formatDate(inspection.inspection_date)}
                </span>
                {inspection.defects && inspection.defects.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {inspection.defects.length} Mängel
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
