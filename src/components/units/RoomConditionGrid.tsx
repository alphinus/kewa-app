/**
 * RoomConditionGrid Component
 *
 * Grid layout showing all rooms in a unit with their condition status.
 * Each room displays name, type, condition badge, and last updated date.
 *
 * Phase 11-02: Room Condition Grid
 * Requirements: HIST-02 (Unit-Übersicht zeigt Renovations-Fortschritt pro Raum)
 */

import { cn } from '@/lib/utils'
import { ConditionBadge } from './ConditionBadge'
import { fetchRoomsWithConditions, type RoomWithCondition } from '@/lib/units/condition-queries'
import type { RoomType } from '@/types'

/**
 * Room type icons (using simple Unicode symbols for now)
 */
const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  bathroom: '\uD83D\uDEC1',    // bathtub
  kitchen: '\uD83C\uDF73',     // cooking
  bedroom: '\uD83D\uDECF\uFE0F', // bed
  living_room: '\uD83D\uDECB\uFE0F', // couch
  hallway: '\uD83D\uDEAA',      // door
  balcony: '\uD83C\uDF3F',      // herb
  storage: '\uD83D\uDCE6',      // package
  laundry: '\uD83E\uDDFA',      // clothes
  garage: '\uD83D\uDE97',       // car
  office: '\uD83D\uDCBC',       // briefcase
  other: '\uD83C\uDFE0'         // house
}

/**
 * German labels for room types
 */
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  bathroom: 'Bad',
  kitchen: 'Küche',
  bedroom: 'Schlafzimmer',
  living_room: 'Wohnzimmer',
  hallway: 'Flur',
  balcony: 'Balkon',
  storage: 'Abstellraum',
  laundry: 'Waschraum',
  garage: 'Garage',
  office: 'Buero',
  other: 'Sonstiges'
}

export interface RoomConditionGridProps {
  /** Unit ID to fetch rooms for */
  unitId: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Format date for display
 */
function formatConditionDate(dateString: string | null): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * RoomConditionGrid displays all rooms in a unit with their conditions.
 *
 * Features:
 * - Responsive grid (2 cols mobile, 3-4 cols desktop)
 * - Room type icon and name
 * - Color-coded condition badge
 * - Last updated date
 * - Empty state for units without rooms
 *
 * @example
 * ```tsx
 * <RoomConditionGrid unitId="unit-123" />
 * ```
 */
export async function RoomConditionGrid({ unitId, className }: RoomConditionGridProps) {
  const rooms = await fetchRoomsWithConditions(unitId)

  if (rooms.length === 0) {
    return (
      <div className={cn(
        'p-8 text-center text-gray-500 dark:text-gray-400',
        'bg-gray-50 dark:bg-gray-800/50 rounded-lg',
        className
      )}>
        <p>Keine Räume für diese Einheit erfasst.</p>
      </div>
    )
  }

  return (
    <div className={cn(
      'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3',
      className
    )}>
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}

/**
 * Individual room card within the grid
 */
function RoomCard({ room }: { room: RoomWithCondition }) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        'bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-700',
        'hover:border-gray-300 dark:hover:border-gray-600',
        'transition-colors duration-200'
      )}
    >
      {/* Room type icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" role="img" aria-label={ROOM_TYPE_LABELS[room.room_type]}>
          {ROOM_TYPE_ICONS[room.room_type]}
        </span>
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {room.name}
        </span>
      </div>

      {/* Room type label */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {ROOM_TYPE_LABELS[room.room_type]}
        {room.area_sqm && ` - ${room.area_sqm} m\u00B2`}
      </p>

      {/* Condition badge */}
      <div className="mb-2">
        <ConditionBadge condition={room.condition} size="sm" showLabel />
      </div>

      {/* Last updated */}
      {room.condition_updated_at && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Aktualisiert: {formatConditionDate(room.condition_updated_at)}
        </p>
      )}
    </div>
  )
}

/**
 * Get room type label in German
 */
export function getRoomTypeLabel(roomType: RoomType): string {
  return ROOM_TYPE_LABELS[roomType]
}

/**
 * Get room type icon
 */
export function getRoomTypeIcon(roomType: RoomType): string {
  return ROOM_TYPE_ICONS[roomType]
}
