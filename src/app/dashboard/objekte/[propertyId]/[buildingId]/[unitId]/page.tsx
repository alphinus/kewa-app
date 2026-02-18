'use client'

/**
 * Unit Detail Page — D6
 *
 * Shows condition summary and clickable room cards for a unit.
 * URL-driven (use(params)), NOT BuildingContext.
 *
 * Path: /dashboard/objekte/[propertyId]/[buildingId]/[unitId]
 * Phase 39-03: Navigation Redesign — bottom drill-down levels
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { ConditionBadge } from '@/components/units/ConditionBadge'
import { RoomForm } from '@/components/units/RoomForm'
import { Card, CardContent } from '@/components/ui/card'
import { formatSwissDate } from '@/lib/costs/payment-helpers'
import type { Unit, Room } from '@/types/database'
import type { RoomCondition } from '@/types'

// =============================================
// TYPES
// =============================================

interface Property {
  id: string
  name: string
}

interface Building {
  id: string
  name: string
}

interface ConditionSummary {
  total: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
}

// =============================================
// HELPERS
// =============================================

function getFloorLabel(floor: number | null): string {
  if (floor === null) return ''
  if (floor < 0) return 'UG'
  if (floor === 0) return 'Erdgeschoss'
  if (floor === 4) return 'Dachgeschoss'
  return `${floor}. Obergeschoss`
}

function getUnitTypeLabel(type: string): string {
  switch (type) {
    case 'apartment': return 'Wohnung'
    case 'common_area': return 'Gemeinschaftsraum'
    case 'building': return 'Gebäude'
    default: return type
  }
}

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

/**
 * Calculate condition summary from rooms array (client-side).
 * Mirrors the logic in einheiten/[id]/page.tsx calculateConditionSummary.
 */
function calculateConditionSummary(rooms: Room[]): ConditionSummary {
  if (rooms.length === 0) {
    return {
      total: 0,
      new_rooms: 0,
      partial_rooms: 0,
      old_rooms: 0,
      renovation_percentage: null,
      overall_condition: null,
    }
  }

  const counts = { new: 0, partial: 0, old: 0 }
  rooms.forEach((room) => { counts[room.condition]++ })

  const total = rooms.length
  const renovation_percentage = Math.round((counts.new / total) * 100)

  let overall_condition: RoomCondition = 'old'
  if (counts.new > counts.partial && counts.new > counts.old) {
    overall_condition = 'new'
  } else if (counts.partial >= counts.new && counts.partial > counts.old) {
    overall_condition = 'partial'
  }

  return {
    total,
    new_rooms: counts.new,
    partial_rooms: counts.partial,
    old_rooms: counts.old,
    renovation_percentage,
    overall_condition,
  }
}

// =============================================
// PAGE COMPONENT
// =============================================

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string; buildingId: string; unitId: string }>
}) {
  const { propertyId, buildingId, unitId } = use(params)

  // Data state
  const [unit, setUnit] = useState<Unit | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [property, setProperty] = useState<Property | null>(null)
  const [building, setBuilding] = useState<Building | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Room form state
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // =============================================
  // DATA FETCHING
  // =============================================

  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      const [unitRes, roomsRes, propertyRes, buildingRes] = await Promise.all([
        fetch(`/api/units/${unitId}`),
        fetch(`/api/rooms?unit_id=${unitId}`),
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/buildings/${buildingId}`),
      ])

      if (!unitRes.ok) {
        throw new Error(`Fehler beim Laden der Einheit: ${unitRes.status}`)
      }

      const unitData = await unitRes.json() as { unit: Unit }
      setUnit(unitData.unit ?? null)

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json() as { rooms: Room[] }
        setRooms(roomsData.rooms ?? [])
      }
      if (propertyRes.ok) {
        const pd = await propertyRes.json() as { property: Property }
        setProperty(pd.property ?? null)
      }
      if (buildingRes.ok) {
        const bd = await buildingRes.json() as { building: Building }
        setBuilding(bd.building ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  // =============================================
  // HANDLERS
  // =============================================

  function handleSaveRoom(savedRoom: Room) {
    if (editingRoom) {
      setRooms((prev) => prev.map((r) => (r.id === savedRoom.id ? savedRoom : r)))
    } else {
      setRooms((prev) => [...prev, savedRoom])
    }
    setShowRoomForm(false)
    setEditingRoom(null)
  }

  // =============================================
  // BREADCRUMB LABELS
  // =============================================

  const breadcrumbLabels = {
    ...(property ? { [propertyId]: property.name } : {}),
    ...(building ? { [buildingId]: building.name } : {}),
    ...(unit ? { [unitId]: unit.name } : {}),
  }

  // =============================================
  // RENDER STATES
  // =============================================

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <DashboardBreadcrumbs labels={breadcrumbLabels} />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="p-4 md:p-6">
        <DashboardBreadcrumbs labels={breadcrumbLabels} />
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">
            {error || 'Einheit nicht gefunden'}
          </p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  const conditionSummary = calculateConditionSummary(rooms)

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardBreadcrumbs labels={breadcrumbLabels} />

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {unit.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                {getUnitTypeLabel(unit.unit_type)}
              </span>
              {unit.floor !== null && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getFloorLabel(unit.floor)}
                </span>
              )}
              {unit.position && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  - {unit.position}
                </span>
              )}
            </div>
            {unit.tenant_name && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Mieter: {unit.tenant_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Condition summary */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Zustand
        </h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keine Räume vorhanden
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Overall condition */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gesamtzustand</p>
                {conditionSummary.overall_condition ? (
                  <ConditionBadge condition={conditionSummary.overall_condition} size="md" />
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </div>

              {/* Renovation percentage */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Renoviert</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {conditionSummary.renovation_percentage !== null
                    ? `${conditionSummary.renovation_percentage}%`
                    : '-'}
                </p>
              </div>

              {/* Room count */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Räume</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {conditionSummary.total}
                </p>
              </div>

              {/* Breakdown */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600 dark:text-green-400">
                    {conditionSummary.new_rooms} Neu
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {conditionSummary.partial_rooms} Teil
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {conditionSummary.old_rooms} Alt
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {conditionSummary.total > 0 && (
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {conditionSummary.new_rooms > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${(conditionSummary.new_rooms / conditionSummary.total) * 100}%`,
                    }}
                  />
                )}
                {conditionSummary.partial_rooms > 0 && (
                  <div
                    className="bg-yellow-500 h-full"
                    style={{
                      width: `${(conditionSummary.partial_rooms / conditionSummary.total) * 100}%`,
                    }}
                  />
                )}
                {conditionSummary.old_rooms > 0 && (
                  <div
                    className="bg-red-500 h-full"
                    style={{
                      width: `${(conditionSummary.old_rooms / conditionSummary.total) * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room cards grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Räume
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditingRoom(null)
              setShowRoomForm(true)
            }}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Raum hinzufügen
          </button>
        </div>

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Keine Räume vorhanden
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Fügen Sie Räume mit dem Button oben rechts hinzu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/dashboard/objekte/${propertyId}/${buildingId}/${unitId}/raum/${room.id}`}
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {room.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getRoomTypeLabel(room.room_type)}
                      </p>
                    </div>
                    <ConditionBadge condition={room.condition} size="sm" />
                  </div>
                  {room.condition_updated_at && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Aktualisiert: {formatSwissDate(room.condition_updated_at)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Room form modal */}
      {showRoomForm && (
        <RoomForm
          mode={editingRoom ? 'edit' : 'create'}
          room={editingRoom || undefined}
          unitId={unitId}
          onSave={handleSaveRoom}
          onCancel={() => {
            setShowRoomForm(false)
            setEditingRoom(null)
          }}
        />
      )}
    </div>
  )
}
