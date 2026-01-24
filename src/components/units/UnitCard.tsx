'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Unit } from '@/types/database'

interface UnitCardProps {
  unit: Unit & { rooms?: { id: string }[] }
  onEdit: (unit: Unit) => void
  onView: (unit: Unit) => void
}

/**
 * Get floor display label in German
 */
function getFloorLabel(floor: number | null): string {
  if (floor === null) return ''
  if (floor < 0) return 'UG'
  if (floor === 0) return 'EG'
  if (floor === 4) return 'DG'
  return `${floor}. OG`
}

/**
 * Unit card component for the unit list
 * Displays unit information including number, tenant, floor, and room count
 */
export function UnitCard({ unit, onEdit, onView }: UnitCardProps) {
  const roomCount = unit.rooms?.length ?? 0
  const isVacant = unit.is_vacant || !unit.tenant_name

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Unit info */}
          <div className="flex-1 min-w-0">
            {/* Unit name/number */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                {unit.unit_number || unit.name}
              </h3>
              {unit.size_class && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium flex-shrink-0">
                  {unit.size_class}
                </span>
              )}
            </div>

            {/* Floor label */}
            {unit.floor !== null && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {getFloorLabel(unit.floor)}
              </p>
            )}

            {/* Tenant or Leerstand */}
            <div className="mb-2">
              {isVacant ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Leerstand
                </span>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Mieter:</span> {unit.tenant_name}
                </p>
              )}
            </div>

            {/* Room count */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {roomCount > 0 ? `${roomCount} Raeume` : '- Raeume'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* View button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onView(unit)}
              title="Anzeigen"
              className="min-h-[40px] min-w-[40px] px-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </Button>

            {/* Edit button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(unit)}
              title="Bearbeiten"
              className="min-h-[40px] min-w-[40px] px-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
