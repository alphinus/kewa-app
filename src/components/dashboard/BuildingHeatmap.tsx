/**
 * BuildingHeatmap Component
 *
 * Full building heatmap showing units colored by room condition status.
 * Follows existing BuildingGrid pattern with 5-floor layout.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-02, DASH-03 (building visualization)
 */

import { cn } from '@/lib/utils'
import { fetchHeatmapData, type HeatmapUnit } from '@/lib/dashboard/heatmap-queries'
import { HeatmapUnitCell } from './HeatmapUnitCell'

/**
 * Floor configuration: label, floor number, column count
 * Matches existing BuildingGrid layout
 */
const FLOOR_CONFIG = [
  { label: 'Dach', floor: 4, cols: 1 },
  { label: '3.OG', floor: 3, cols: 3 },
  { label: '2.OG', floor: 2, cols: 3 },
  { label: '1.OG', floor: 1, cols: 3 },
  { label: 'EG', floor: 0, cols: 3 },
] as const

/**
 * Position order for apartment placement in grid
 */
const POSITION_ORDER = ['links', 'mitte', 'rechts'] as const

/**
 * Find unit by floor and position
 */
function getUnitByFloorPosition(
  units: HeatmapUnit[],
  floor: number,
  position: string
): HeatmapUnit | null {
  return units.find(
    (u) => u.floor === floor && u.position?.toLowerCase() === position.toLowerCase()
  ) || null
}

/**
 * Find unit by floor only (for Dach which has one unit)
 */
function getUnitByFloor(units: HeatmapUnit[], floor: number): HeatmapUnit | null {
  return units.find((u) => u.floor === floor) || null
}

export interface BuildingHeatmapProps {
  /** Building to display heatmap for */
  buildingId: string
  /** Click handler when unit is selected */
  onUnitClick?: (unitId: string) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * BuildingHeatmap displays units in a visual floor layout with condition colors.
 *
 * Layout:
 * - 5 floors from Dach (top) to EG (bottom)
 * - 3 positions per floor: Links, Mitte, Rechts
 * - Dach spans all 3 columns (single unit)
 * - Each unit colored by overall condition (red/yellow/green)
 */
export async function BuildingHeatmap({
  buildingId,
  onUnitClick,
  className
}: BuildingHeatmapProps) {
  const units = await fetchHeatmapData(buildingId)

  return (
    <div className={cn('space-y-1', className)}>
      {FLOOR_CONFIG.map(({ label, floor, cols }) => (
        <div key={floor} className="flex items-center gap-2">
          {/* Floor label */}
          <div className="w-10 sm:w-12 flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
              {label}
            </span>
          </div>

          {/* Floor units */}
          <div className={cn(
            'flex-1 grid gap-1 sm:gap-2',
            cols === 1 ? 'grid-cols-1' : 'grid-cols-3'
          )}>
            {cols === 1 ? (
              <DachCell units={units} floor={floor} onUnitClick={onUnitClick} />
            ) : (
              POSITION_ORDER.map((position) => {
                const unit = getUnitByFloorPosition(units, floor, position)
                return unit ? (
                  <HeatmapUnitCell
                    key={unit.id}
                    unit={unit}
                    onClick={() => onUnitClick?.(unit.id)}
                    compact
                  />
                ) : (
                  <EmptyCell key={`${floor}-${position}`} />
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Dach cell with special handling (may have one unit)
 */
function DachCell({
  units,
  floor,
  onUnitClick
}: {
  units: HeatmapUnit[]
  floor: number
  onUnitClick?: (id: string) => void
}) {
  const unit = getUnitByFloor(units, floor)

  if (!unit) return <EmptyCell />

  return (
    <HeatmapUnitCell
      unit={unit}
      onClick={() => onUnitClick?.(unit.id)}
      compact
    />
  )
}

/**
 * Empty cell placeholder for missing units
 */
function EmptyCell() {
  return (
    <div className={cn(
      'min-h-[60px] rounded-xl',
      'border border-dashed border-gray-200 dark:border-gray-700',
      'bg-gray-50 dark:bg-gray-900/50',
      'flex items-center justify-center'
    )}>
      <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
    </div>
  )
}
