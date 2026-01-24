'use client'

import { ConditionBadge } from './ConditionBadge'
import type { Room } from '@/types/database'

/**
 * Room type labels in German
 */
const ROOM_TYPE_LABELS: Record<string, string> = {
  living_room: 'Wohnzimmer',
  bedroom: 'Schlafzimmer',
  kitchen: 'Kueche',
  bathroom: 'Badezimmer',
  toilet: 'WC',
  hallway: 'Flur',
  storage: 'Abstellraum',
  balcony: 'Balkon',
  laundry: 'Waschkueche',
  garage: 'Garage',
  office: 'Buero',
  other: 'Sonstiges'
}

/**
 * Get German label for room type
 */
function getRoomTypeLabel(roomType: string): string {
  return ROOM_TYPE_LABELS[roomType] ?? roomType
}

interface RoomCardProps {
  room: Room
  onEdit: (room: Room) => void
}

/**
 * RoomCard Component
 *
 * Displays a room with its name, type, area, and condition.
 * Includes an edit button for room management.
 *
 * Phase 15-04: Unit Detail Page
 */
export function RoomCard({ room, onEdit }: RoomCardProps) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        {/* Room info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {room.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getRoomTypeLabel(room.room_type)}
            </span>
            {room.area_sqm && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {room.area_sqm} m2
              </span>
            )}
          </div>
        </div>

        {/* Condition and Edit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConditionBadge condition={room.condition} size="sm" />
          <button
            type="button"
            onClick={() => onEdit(room)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Bearbeiten"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
