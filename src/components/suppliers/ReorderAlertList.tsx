'use client'

/**
 * ReorderAlertList Component
 *
 * Displays active reorder alerts sorted by urgency.
 *
 * Phase 20-02: Inventory Tracking
 */

import type { ReorderAlert } from '@/types/suppliers'
import {
  getAlertUrgencyColor,
  getAlertUrgencyLabel,
} from '@/lib/suppliers/alert-calculations'

interface ReorderAlertListProps {
  alerts: ReorderAlert[]
}

/**
 * Format date for display (Swiss locale)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Get urgency sort order
 */
function getUrgencySortOrder(urgency: 'critical' | 'warning' | 'normal'): number {
  switch (urgency) {
    case 'critical':
      return 1
    case 'warning':
      return 2
    case 'normal':
      return 3
    default:
      return 99
  }
}

export function ReorderAlertList({ alerts }: ReorderAlertListProps) {
  // Sort by urgency (critical first), then by days_until_empty
  const sortedAlerts = [...alerts].sort((a, b) => {
    const urgencyDiff =
      getUrgencySortOrder(a.urgency) - getUrgencySortOrder(b.urgency)
    if (urgencyDiff !== 0) return urgencyDiff

    // If urgency same, sort by days_until_empty (null last)
    if (a.days_until_empty === null && b.days_until_empty === null) return 0
    if (a.days_until_empty === null) return 1
    if (b.days_until_empty === null) return -1
    return a.days_until_empty - b.days_until_empty
  })

  if (sortedAlerts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <p className="text-green-700 dark:text-green-400">
          Keine Warnungen — alle Bestaende im gruenen Bereich
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedAlerts.map((alert) => {
        const urgencyColor = getAlertUrgencyColor(alert.urgency)
        const urgencyLabel = getAlertUrgencyLabel(alert.urgency)

        return (
          <div
            key={alert.property_id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">{alert.property_name || 'Unbekannte Liegenschaft'}</h4>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${urgencyColor} bg-current bg-opacity-10`}
              >
                {urgencyLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Aktueller Stand:
                </span>{' '}
                <span className="font-medium">
                  {alert.current_level.toFixed(2)} t
                </span>
              </div>

              {alert.level_percentage !== null && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Fuellstand:
                  </span>{' '}
                  <span className={`font-medium ${urgencyColor}`}>
                    {alert.level_percentage.toFixed(1)}%
                  </span>
                </div>
              )}

              {alert.daily_usage_rate && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Verbrauch/Tag:
                  </span>{' '}
                  <span className="font-medium">
                    {alert.daily_usage_rate.toFixed(3)} t
                  </span>
                </div>
              )}

              {alert.days_until_empty !== null && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Tage verbleibend:
                  </span>{' '}
                  <span className={`font-medium ${urgencyColor}`}>
                    {alert.days_until_empty}
                  </span>
                </div>
              )}

              {alert.projected_empty_date && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Voraussichtlich leer am:
                  </span>{' '}
                  <span className="font-medium">
                    {formatDate(alert.projected_empty_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
