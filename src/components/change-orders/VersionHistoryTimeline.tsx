'use client'

/**
 * VersionHistoryTimeline Component
 *
 * Displays version history as a vertical timeline.
 * Shows all revisions with version number, date, author, reason, and amount change.
 *
 * Phase 21-02: Approval Workflow
 */

import type { ChangeOrderVersion } from '@/types/change-orders'
import { formatCHF, formatSwissDate } from '@/lib/change-orders/queries'

interface VersionHistoryTimelineProps {
  versions: ChangeOrderVersion[]
  currentVersion: number
}

export function VersionHistoryTimeline({
  versions,
  currentVersion,
}: VersionHistoryTimelineProps) {
  if (versions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        Keine Versionsverlauf verfügbar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {versions.map((version, index) => {
        const isCurrent = version.version === currentVersion
        const isFirst = index === 0
        const prevVersion = index < versions.length - 1 ? versions[index + 1] : null
        const amountChange = prevVersion
          ? (version.total_amount ?? 0) - (prevVersion.total_amount ?? 0)
          : null

        return (
          <div key={version.version_id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  isCurrent
                    ? 'bg-blue-600 ring-4 ring-blue-100'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              {!isFirst && (
                <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />
              )}
            </div>

            {/* Version details */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Version {version.version}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        (Aktuell)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSwissDate(version.revised_at)}
                  </p>
                </div>
                {version.total_amount !== null && (
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold ${
                        (version.total_amount ?? 0) < 0
                          ? 'text-red-600'
                          : (version.total_amount ?? 0) > 0
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {(version.total_amount ?? 0) < 0 ? '' : '+'}
                      {formatCHF(version.total_amount)}
                    </div>
                    {amountChange !== null && amountChange !== 0 && (
                      <div
                        className={`text-xs ${
                          amountChange < 0 ? 'text-red-500' : 'text-green-500'
                        }`}
                      >
                        {amountChange > 0 ? '+' : ''}
                        {formatCHF(amountChange)} vs. V{version.version - 1}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Revision reason */}
              {version.revision_reason && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Grund der Überarbeitung:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {version.revision_reason}
                  </p>
                </div>
              )}

              {/* Description if changed */}
              {version.description && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beschreibung:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {version.description}
                  </p>
                </div>
              )}

              {/* Schedule impact if present */}
              {version.schedule_impact_days !== null &&
                version.schedule_impact_days !== 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Zeitplan-Auswirkung:{' '}
                      <span
                        className={
                          version.schedule_impact_days < 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {version.schedule_impact_days > 0 ? '+' : ''}
                        {version.schedule_impact_days} Tage
                      </span>
                    </p>
                  </div>
                )}

              {/* Line items count */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {version.line_items.length} Position
                {version.line_items.length !== 1 ? 'en' : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
