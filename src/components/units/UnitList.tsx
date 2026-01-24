'use client'

import { UnitCard } from './UnitCard'
import { Card, CardContent } from '@/components/ui/card'
import type { Unit } from '@/types/database'

interface UnitListProps {
  units: (Unit & { rooms?: { id: string }[] })[]
  onEdit: (unit: Unit) => void
  onView: (unit: Unit) => void
}

/**
 * Unit list component displaying units in a grid layout
 * Responsive: 1 column on mobile, 2 on tablet, 3 on desktop
 */
export function UnitList({ units, onEdit, onView }: UnitListProps) {
  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mx-auto mb-4 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            Keine Einheiten vorhanden
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Erstellen Sie eine neue Einheit mit dem Button oben rechts.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {units.map((unit) => (
        <UnitCard
          key={unit.id}
          unit={unit}
          onEdit={onEdit}
          onView={onView}
        />
      ))}
    </div>
  )
}
