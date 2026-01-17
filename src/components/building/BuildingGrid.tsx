'use client'

import { cn } from '@/lib/utils'
import type { UnitWithStats } from '@/types/database'
import { UnitCell } from './UnitCell'

/**
 * Floor configuration: label, floor number, column count
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
  apartments: UnitWithStats[],
  floor: number,
  position: string
): UnitWithStats | null {
  return apartments.find(
    (apt) =>
      apt.floor === floor &&
      apt.position?.toLowerCase() === position.toLowerCase()
  ) || null
}

/**
 * Find unit by floor only (for Dach which has one unit)
 */
function getUnitByFloor(
  apartments: UnitWithStats[],
  floor: number
): UnitWithStats | null {
  return apartments.find((apt) => apt.floor === floor) || null
}

export interface BuildingGridProps {
  /** Apartments to display (filtered to unit_type='apartment') */
  apartments: UnitWithStats[]
  /** Click handler for unit selection */
  onUnitClick: (unit: UnitWithStats) => void
}

/**
 * BuildingGrid displays apartments in a visual floor layout
 *
 * Layout:
 * - 5 floors from Dach (top) to EG (bottom)
 * - 3 positions per floor: Links, Mitte, Rechts
 * - Dach spans all 3 columns (single unit)
 *
 * ```
 * | Dach (col-span-3)                    |
 * | 3.OG L | 3.OG M | 3.OG R |
 * | 2.OG L | 2.OG M | 2.OG R |
 * | 1.OG L | 1.OG M | 1.OG R |
 * | EG L   | EG M   | EG R   |
 * ```
 */
export function BuildingGrid({ apartments, onUnitClick }: BuildingGridProps) {
  return (
    <div className="space-y-1">
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
              // Dach: single unit spanning full width
              <DachCell
                apartments={apartments}
                floor={floor}
                onUnitClick={onUnitClick}
              />
            ) : (
              // Regular floors: 3 units per row
              POSITION_ORDER.map((position) => {
                const unit = getUnitByFloorPosition(apartments, floor, position)
                return unit ? (
                  <UnitCell
                    key={unit.id}
                    unit={unit}
                    onClick={() => onUnitClick(unit)}
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
  apartments,
  floor,
  onUnitClick,
}: {
  apartments: UnitWithStats[]
  floor: number
  onUnitClick: (unit: UnitWithStats) => void
}) {
  const unit = getUnitByFloor(apartments, floor)

  if (!unit) {
    return <EmptyCell />
  }

  return (
    <UnitCell
      unit={unit}
      onClick={() => onUnitClick(unit)}
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
