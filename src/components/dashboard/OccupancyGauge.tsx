/**
 * OccupancyGauge Component
 *
 * Combined occupancy meter showing unit and parking occupancy
 * with progress bars and sparkline trend visualization.
 *
 * Phase 12-03: Occupancy Dashboard
 * Requirements: OCCU-01, OCCU-02, OCCU-03, PARK-05
 */

import { fetchOccupancyMetrics, fetchOccupancyHistory } from '@/lib/dashboard/occupancy-queries'
import { OccupancySparkline } from './OccupancySparkline'
import { cn } from '@/lib/utils'

interface OccupancyGaugeProps {
  /** Building ID to fetch occupancy data for */
  buildingId: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Server component displaying combined occupancy gauge.
 *
 * Features:
 * - Combined occupancy percentage prominently displayed
 * - Main progress bar with threshold coloring
 * - Separate unit and parking breakdowns
 * - Sparkline showing 6-month trend
 *
 * @example
 * <OccupancyGauge buildingId="uuid-here" />
 */
export async function OccupancyGauge({ buildingId, className }: OccupancyGaugeProps) {
  // Fetch occupancy metrics and history in parallel
  const [metrics, history] = await Promise.all([
    fetchOccupancyMetrics(buildingId),
    fetchOccupancyHistory(buildingId, 6)
  ])

  /**
   * Get Tailwind background color class based on occupancy percentage.
   * - >= 90%: green (healthy)
   * - >= 70%: amber (attention)
   * - < 70%: red (concern)
   */
  const getColorClass = (percent: number) => {
    if (percent >= 90) return 'bg-green-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }

  /**
   * Get Tailwind text color class for the percentage display.
   */
  const getTextColorClass = (percent: number) => {
    if (percent >= 90) return 'text-green-600 dark:text-green-400'
    if (percent >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={cn(
      'p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
      className
    )}>
      {/* Header with title and combined percentage */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Auslastung
        </h3>
        <span className={cn(
          'text-2xl font-bold',
          getTextColorClass(metrics.combinedOccupancyPercent)
        )}>
          {metrics.combinedOccupancyPercent}%
        </span>
      </div>

      {/* Combined occupancy progress bar */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            getColorClass(metrics.combinedOccupancyPercent)
          )}
          style={{ width: `${metrics.combinedOccupancyPercent}%` }}
          role="progressbar"
          aria-valuenow={metrics.combinedOccupancyPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Gesamtauslastung"
        />
      </div>

      {/* Unit and Parking breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Units breakdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Wohnungen
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {metrics.occupiedUnits}/{metrics.totalUnits}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getColorClass(metrics.unitOccupancyPercent))}
              style={{ width: `${metrics.unitOccupancyPercent}%` }}
              role="progressbar"
              aria-valuenow={metrics.unitOccupancyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Wohnungsauslastung"
            />
          </div>
        </div>

        {/* Parking breakdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Parkplaetze
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {metrics.occupiedParking}/{metrics.totalParking}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getColorClass(metrics.parkingOccupancyPercent))}
              style={{ width: `${metrics.parkingOccupancyPercent}%` }}
              role="progressbar"
              aria-valuenow={metrics.parkingOccupancyPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Parkplatzauslastung"
            />
          </div>
        </div>
      </div>

      {/* Sparkline trend */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Trend (6 Mt.)
        </span>
        <OccupancySparkline data={history} height={24} />
      </div>
    </div>
  )
}
