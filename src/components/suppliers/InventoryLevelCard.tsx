'use client'

/**
 * InventoryLevelCard Component
 *
 * Displays current inventory level for a property with color-coded percentage.
 *
 * Phase 20-02: Inventory Tracking
 */

import Link from 'next/link'
import type { CurrentInventoryLevel } from '@/types/suppliers'

interface InventoryLevelCardProps {
  level: CurrentInventoryLevel
  propertyName: string
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
 * Get color class based on level percentage
 */
function getLevelColor(percentage: number | null): string {
  if (percentage === null) return 'text-gray-600 dark:text-gray-400'
  if (percentage > 50) return 'text-green-600 dark:text-green-400'
  if (percentage >= 20) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get background color class based on level percentage
 */
function getLevelBgColor(percentage: number | null): string {
  if (percentage === null) return 'bg-gray-100 dark:bg-gray-800'
  if (percentage > 50) return 'bg-green-50 dark:bg-green-900/20'
  if (percentage >= 20) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

export function InventoryLevelCard({ level, propertyName }: InventoryLevelCardProps) {
  const percentage = level.level_percentage ?? 0
  const hasData = level.daily_usage_rate !== null

  return (
    <Link
      href={`/dashboard/lieferanten/bestand/${level.property_id}`}
      className="block"
    >
      <div
        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getLevelBgColor(
          level.level_percentage
        )}`}
      >
        <h3 className="font-semibold text-lg mb-3">{propertyName}</h3>

        <div className="space-y-2">
          {/* Current Level */}
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Aktueller Stand:
            </span>
            <span className="font-semibold">
              {level.tank_level.toFixed(2)} t
            </span>
          </div>

          {/* Capacity */}
          {level.tank_capacity && (
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Kapazität:
              </span>
              <span className="text-sm">{level.tank_capacity.toFixed(2)} t</span>
            </div>
          )}

          {/* Percentage */}
          {level.level_percentage !== null && (
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Fuellstand:
              </span>
              <span className={`font-semibold ${getLevelColor(level.level_percentage)}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Daily Usage Rate */}
          {hasData ? (
            <>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Verbrauch/Tag:
                </span>
                <span className="text-sm">
                  {level.daily_usage_rate!.toFixed(3)} t
                </span>
              </div>

              {/* Projected Empty Date */}
              {level.projected_empty_date && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Leer am:
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(level.projected_empty_date)}
                  </span>
                </div>
              )}

              {/* Days Until Empty */}
              {level.projected_empty_date && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Tage verbleibend:
                  </span>
                  <span className="text-sm">
                    {Math.floor(
                      (new Date(level.projected_empty_date).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">
              Keine Verbrauchsdaten
            </div>
          )}

          {/* Last Reading Date */}
          <div className="flex justify-between items-baseline text-xs text-gray-500 dark:text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span>Letzte Ablesung:</span>
            <span>{formatDate(level.movement_date)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
