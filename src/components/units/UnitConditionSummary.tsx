/**
 * UnitConditionSummary Component
 *
 * Displays overall unit renovation progress with progress bar
 * and room condition breakdown.
 *
 * Phase 11-02: Room Condition Grid
 * Requirements: HIST-05 (Unit-Summary wird automatisch berechnet)
 */

import { cn } from '@/lib/utils'
import { fetchUnitConditionSummary } from '@/lib/units/condition-queries'

export interface UnitConditionSummaryProps {
  /** Unit ID to fetch summary for */
  unitId: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Get progress bar color based on renovation percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 50) return 'bg-yellow-500'
  if (percentage >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * Get progress text color based on renovation percentage
 */
function getProgressTextColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600 dark:text-green-400'
  if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
  if (percentage >= 20) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * UnitConditionSummary displays the overall renovation progress of a unit.
 *
 * Shows:
 * - Percentage renovated with progress bar
 * - Breakdown: X neu, Y teilrenoviert, Z alt
 * - Last update date
 *
 * @example
 * ```tsx
 * <UnitConditionSummary unitId="unit-123" />
 * ```
 */
export async function UnitConditionSummary({ unitId, className }: UnitConditionSummaryProps) {
  const summary = await fetchUnitConditionSummary(unitId)

  // No rooms in unit
  if (!summary || summary.total_rooms === 0) {
    return (
      <div className={cn(
        'p-4 rounded-lg',
        'bg-gray-50 dark:bg-gray-800/50',
        'text-center text-gray-500 dark:text-gray-400',
        className
      )}>
        <p>Keine Raeume erfasst - Renovationsstatus nicht verfuegbar.</p>
      </div>
    )
  }

  const percentage = summary.renovation_percentage ?? 0

  return (
    <div className={cn(
      'p-4 rounded-lg',
      'bg-gray-50 dark:bg-gray-800',
      className
    )}>
      {/* Header with percentage */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Renovationsstatus
        </span>
        <span className={cn(
          'text-lg font-bold',
          getProgressTextColor(percentage)
        )}>
          {Math.round(percentage)}% renoviert
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            getProgressColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {summary.new_rooms > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {summary.new_rooms} Neu
            </span>
          </span>
        )}
        {summary.partial_rooms > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {summary.partial_rooms} Teilrenoviert
            </span>
          </span>
        )}
        {summary.old_rooms > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {summary.old_rooms} Alt
            </span>
          </span>
        )}
      </div>

      {/* Last update */}
      {summary.last_condition_update && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Letzte Aktualisierung: {formatDate(summary.last_condition_update)}
        </p>
      )}
    </div>
  )
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Inline version for embedding in other components
 * Shows just the percentage and mini progress bar
 */
export async function UnitConditionSummaryInline({ unitId, className }: UnitConditionSummaryProps) {
  const summary = await fetchUnitConditionSummary(unitId)

  if (!summary || summary.total_rooms === 0) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        -
      </span>
    )
  }

  const percentage = summary.renovation_percentage ?? 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', getProgressColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium', getProgressTextColor(percentage))}>
        {Math.round(percentage)}%
      </span>
    </div>
  )
}
