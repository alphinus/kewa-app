/**
 * PropertyDashboard Component
 *
 * Main dashboard container combining summary stats, building heatmap,
 * and parking section.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-01 (property dashboard)
 */

import { cookies } from 'next/headers'
import { fetchDashboardSummary } from '@/lib/dashboard/dashboard-queries'
import { BuildingHeatmap } from './BuildingHeatmap'
import { OccupancyGauge } from './OccupancyGauge'
import { ParkingSection } from '@/components/parking/ParkingSection'
import { cn } from '@/lib/utils'

export interface PropertyDashboardProps {
  /** Building to display dashboard for */
  buildingId: string
  /** Additional CSS classes */
  className?: string
}

/**
 * PropertyDashboard displays:
 * - Summary statistics (units, renovation %, active projects, rooms)
 * - Building heatmap with condition-colored units
 * - Parking section alongside building
 */
export async function PropertyDashboard({
  buildingId,
  className
}: PropertyDashboardProps) {
  const orgId = (await cookies()).get('organization_id')?.value ?? ''
  const summary = await fetchDashboardSummary(buildingId, orgId)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Wohnungen"
          value={summary.totalUnits}
        />
        <StatCard
          label="Renovierungsgrad"
          value={`${summary.averageRenovationPercent}%`}
          color="green"
        />
        <StatCard
          label="Aktive Projekte"
          value={summary.activeProjects}
          color="blue"
        />
        <StatCard
          label="Räume renoviert"
          value={`${summary.renovatedRooms}/${summary.totalRooms}`}
        />
      </div>

      {/* Occupancy Gauge */}
      <OccupancyGauge buildingId={buildingId} />

      {/* Building + Parking Layout */}
      <div className="flex gap-4">
        {/* Building Heatmap */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Gebäude
          </h3>
          <BuildingHeatmap
            buildingId={buildingId}
          />
        </div>

        {/* Parking Section */}
        <div className="w-24 sm:w-32 flex-shrink-0">
          <ParkingSection buildingId={buildingId} />
        </div>
      </div>
    </div>
  )
}

/**
 * StatCard displays a single statistic
 */
function StatCard({
  label,
  value,
  color
}: {
  label: string
  value: string | number
  color?: 'green' | 'blue' | 'amber'
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={cn(
        'text-xl font-bold',
        color ? colorClasses[color] : 'text-gray-900 dark:text-gray-100'
      )}>
        {value}
      </p>
    </div>
  )
}
