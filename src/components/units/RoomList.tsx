'use client'

import { Plus } from 'lucide-react'
import { RoomCard } from './RoomCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Room } from '@/types/database'

interface RoomListProps {
  rooms: Room[]
  onEdit: (room: Room) => void
  onAdd: () => void
}

/**
 * RoomList Component
 *
 * Displays a list of rooms in a grid layout with add functionality.
 * Shows empty state when no rooms exist.
 *
 * Phase 15-04: Unit Detail Page
 */
export function RoomList({ rooms, onEdit, onAdd }: RoomListProps) {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Räume
          </h3>
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Hinzufügen
          </Button>
        </div>

        {/* Room grid or empty state */}
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              Keine Räume vorhanden
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Fügen Sie Räume hinzu, um den Zustand zu verfolgen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onEdit={onEdit} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
