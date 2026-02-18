'use client'

/**
 * Room Detail Page
 *
 * Shows room condition, source project, and action links.
 * URL-driven (use(params)), NOT BuildingContext.
 *
 * Path: /dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]
 * Phase 39-03: Navigation Redesign — bottom drill-down levels
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import type { RoomCondition } from '@/types'

// =============================================
// TYPES
// =============================================

interface Room {
  id: string
  name: string
  room_type: string
  condition: RoomCondition
  condition_updated_at: string | null
  condition_source_project_id: string | null
  unit_id: string
  condition_source_project?: {
    id: string
    name: string
  } | null
  unit?: {
    id: string
    name: string
    building_id: string
    building?: {
      id: string
      name: string
    }
  } | null
}

interface Property {
  id: string
  name: string
}

interface Building {
  id: string
  name: string
}

// =============================================
// HELPERS
// =============================================

function getRoomTypeLabel(roomType: string): string {
  const labels: Record<string, string> = {
    living_room: 'Wohnzimmer',
    bedroom: 'Schlafzimmer',
    kitchen: 'Küche',
    bathroom: 'Badezimmer',
    toilet: 'WC',
    hallway: 'Flur',
    storage: 'Abstellraum',
    balcony: 'Balkon',
    other: 'Sonstiges',
  }
  return labels[roomType] ?? roomType
}

const CONDITION_LABEL: Record<RoomCondition, string> = {
  new: 'Neu',
  partial: 'Teilsaniert',
  old: 'Unsaniert',
}

const CONDITION_COLOR: Record<RoomCondition, string> = {
  new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  old: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

// =============================================
// PAGE COMPONENT
// =============================================

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{
    propertyId: string
    buildingId: string
    unitId: string
    roomId: string
  }>
}) {
  const { propertyId, buildingId, unitId, roomId } = use(params)

  const [room, setRoom] = useState<Room | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [building, setBuilding] = useState<Building | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      const [roomRes, propertyRes, buildingRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`),
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/buildings/${buildingId}`),
      ])

      if (!roomRes.ok) {
        throw new Error(`Raum nicht gefunden (${roomRes.status})`)
      }

      const roomData = await roomRes.json() as { room: Room }
      setRoom(roomData.room ?? null)

      if (propertyRes.ok) {
        const pd = await propertyRes.json() as { property: Property }
        setProperty(pd.property ?? null)
      }
      if (buildingRes.ok) {
        const bd = await buildingRes.json() as { building: Building }
        setBuilding(bd.building ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // =============================================
  // BREADCRUMB LABELS
  // =============================================

  const breadcrumbLabels = {
    ...(property ? { [propertyId]: property.name } : {}),
    ...(building ? { [buildingId]: building.name } : {}),
    ...(room?.unit ? { [unitId]: room.unit.name } : {}),
    ...(room ? { [roomId]: room.name } : {}),
  }

  // =============================================
  // RENDER STATES
  // =============================================

  if (isLoading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <DashboardBreadcrumbs labels={breadcrumbLabels} />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <DashboardBreadcrumbs labels={breadcrumbLabels} />
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || 'Raum nicht gefunden'}
        </div>
      </div>
    )
  }

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto space-y-6">
      <DashboardBreadcrumbs labels={breadcrumbLabels} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {room.name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {getRoomTypeLabel(room.room_type)}
        </p>
      </div>

      {/* Room condition card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Raumzustand
          </h3>

          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                CONDITION_COLOR[room.condition]
              }`}
            >
              {CONDITION_LABEL[room.condition]}
            </span>
          </div>

          {room.condition_updated_at && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aktualisiert am{' '}
              {new Date(room.condition_updated_at).toLocaleDateString('de-CH')}
            </p>
          )}

          {room.condition_source_project && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quelle:{' '}
              <Link
                href={`/dashboard/projekte/${room.condition_source_project.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {room.condition_source_project.name}
              </Link>
            </p>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Der Raumzustand wird automatisch aktualisiert, wenn eine Abnahme mit
            Ergebnis &quot;Bestanden&quot; oder &quot;Bestanden mit Auflagen&quot; abgeschlossen wird.
          </p>
        </CardContent>
      </Card>

      {/* Action links card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Aktionen
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/aufgaben?room_id=${room.id}`}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              Aufgaben anzeigen
            </Link>
            <Link
              href={`/dashboard/abnahmen?room_id=${room.id}`}
              className="px-4 py-2 text-sm bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              Abnahmen anzeigen
            </Link>
            {room.condition_source_project && (
              <Link
                href={`/dashboard/projekte/${room.condition_source_project.id}`}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                Quellprojekt öffnen
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
