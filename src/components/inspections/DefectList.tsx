'use client'

/**
 * DefectList Component
 *
 * List of defects for an inspection sorted by severity and date.
 *
 * Phase 22-02: Inspection UI
 */

import { SeverityBadge } from './SeverityBadge'
import type { InspectionDefect } from '@/types/inspections'

interface DefectListProps {
  defects: InspectionDefect[]
  onDefectClick: (defect: InspectionDefect) => void
}

const STATUS_LABELS = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Behoben',
}

export function DefectList({ defects, onDefectClick }: DefectListProps) {
  // Sort by severity DESC (schwer first), then by created_at ASC
  const sortedDefects = [...defects].sort((a, b) => {
    const severityOrder = { schwer: 0, mittel: 1, gering: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  if (defects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Keine Mängel erfasst</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedDefects.map((defect) => (
        <button
          key={defect.id}
          onClick={() => onDefectClick(defect)}
          className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-800 text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{defect.title}</h4>
              {defect.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {defect.description}
                </p>
              )}
            </div>
            <SeverityBadge severity={defect.severity} />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
              {STATUS_LABELS[defect.status]}
            </span>
            {defect.photo_storage_paths && defect.photo_storage_paths.length > 0 && (
              <span className="flex items-center gap-1">
                📷 {defect.photo_storage_paths.length}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
