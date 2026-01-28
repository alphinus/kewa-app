'use client'

/**
 * Room Detail Page
 *
 * Displays room details including condition, source project, and update history.
 * Shows condition source when updated by inspection completion.
 *
 * Path: /dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]
 * Phase: 23-03 Inspection Integration
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import type { RoomCondition } from '@/types'

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
  }
}

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string; roomId: string }>
}) {
  const { id: buildingId, unitId, roomId } = use(params)

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`)
        if (!res.ok) {
          throw new Error('Raum nicht gefunden')
        }
        const data = await res.json()
        setRoom(data.room)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()
  }, [roomId])

  if (loading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">Laden...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || 'Raum nicht gefunden'}
        </div>
      </div>
    )
  }

  const conditionLabel = {
    new: 'Neu',
    partial: 'Teilsaniert',
    old: 'Unsaniert',
  }

  const conditionColor = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    old: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Liegenschaft', href: '/dashboard/liegenschaft' },
          ...(room.unit?.building?.name
            ? [{ label: room.unit.building.name, href: `/dashboard/liegenschaft?building=${buildingId}` }]
            : []),
          ...(room.unit?.name
            ? [{ label: room.unit.name, href: `/dashboard/liegenschaft/${buildingId}/einheit/${unitId}` }]
            : []),
          { label: room.name },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {room.name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {room.room_type}
        </p>
      </div>

      {/* Room Condition */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Raumzustand
          </h3>

          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                conditionColor[room.condition]
              }`}
            >
              {conditionLabel[room.condition]}
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

      {/* Quick Links */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Aktionen
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/aufgaben?room_id=${room.id}`}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              Aufgaben anzeigen
            </Link>
            <Link
              href={`/dashboard/abnahmen?room_id=${room.id}`}
              className="px-4 py-2 text-sm bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50"
            >
              Abnahmen anzeigen
            </Link>
            {room.condition_source_project && (
              <Link
                href={`/dashboard/projekte/${room.condition_source_project.id}`}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
              >
                Quellprojekt oeffnen
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
