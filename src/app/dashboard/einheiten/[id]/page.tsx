/**
 * Unit Detail Page
 *
 * Client component showing unit details with room management.
 * Displays tenant info, condition overview, and room list with CRUD.
 *
 * Path: /dashboard/einheiten/[id]
 * Phase 15-04: Unit Detail Page
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { TenantSection } from '@/components/units/TenantSection'
import { RoomList } from '@/components/units/RoomList'
import { RoomForm } from '@/components/units/RoomForm'
import { ConditionBadge } from '@/components/units/ConditionBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Unit, Room } from '@/types/database'
import type { RoomCondition } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get floor display text
 */
function getFloorLabel(floor: number | null): string {
  if (floor === null) return ''
  if (floor < 0) return 'UG'
  if (floor === 0) return 'Erdgeschoss'
  if (floor === 4) return 'Dachgeschoss'
  return `${floor}. Obergeschoss`
}

/**
 * Get unit type label in German
 */
function getUnitTypeLabel(type: string): string {
  switch (type) {
    case 'apartment':
      return 'Wohnung'
    case 'common_area':
      return 'Gemeinschaftsraum'
    case 'building':
      return 'Gebaeude'
    default:
      return type
  }
}

/**
 * Calculate condition summary from rooms
 */
function calculateConditionSummary(rooms: Room[]) {
  if (rooms.length === 0) {
    return {
      total: 0,
      new_rooms: 0,
      partial_rooms: 0,
      old_rooms: 0,
      renovation_percentage: null,
      overall_condition: null as RoomCondition | null
    }
  }

  const counts = {
    new: 0,
    partial: 0,
    old: 0
  }

  rooms.forEach(room => {
    counts[room.condition]++
  })

  const total = rooms.length
  const renovation_percentage = total > 0
    ? Math.round((counts.new / total) * 100)
    : null

  // Overall condition: majority wins, bias toward worst
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
    overall_condition
  }
}

export default function UnitDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  // Data state
  const [unit, setUnit] = useState<Unit | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  /**
   * Fetch unit and rooms data
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch unit and rooms in parallel
      const [unitRes, roomsRes] = await Promise.all([
        fetch(`/api/units/${id}`),
        fetch(`/api/rooms?unit_id=${id}`)
      ])

      if (!unitRes.ok) {
        if (unitRes.status === 404) {
          throw new Error('Einheit nicht gefunden')
        }
        throw new Error('Fehler beim Laden der Einheit')
      }

      if (!roomsRes.ok) {
        throw new Error('Fehler beim Laden der Raeume')
      }

      const [unitData, roomsData] = await Promise.all([
        unitRes.json(),
        roomsRes.json()
      ])

      setUnit(unitData.unit)
      setRooms(roomsData.rooms || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Load data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Handle add room click
   */
  function handleAddRoom() {
    setEditingRoom(null)
    setShowRoomForm(true)
  }

  /**
   * Handle edit room click
   */
  function handleEditRoom(room: Room) {
    setEditingRoom(room)
    setShowRoomForm(true)
  }

  /**
   * Handle room save - add or update room in list
   */
  function handleSaveRoom(savedRoom: Room) {
    if (editingRoom) {
      // Update existing room in list
      setRooms(prev => prev.map(r => r.id === savedRoom.id ? savedRoom : r))
    } else {
      // Add new room to list
      setRooms(prev => [...prev, savedRoom])
    }
    setShowRoomForm(false)
    setEditingRoom(null)
  }

  /**
   * Handle room form cancel
   */
  function handleCancelRoom() {
    setShowRoomForm(false)
    setEditingRoom(null)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        {/* Breadcrumb skeleton */}
        <div className="animate-pulse h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />

        {/* Header skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !unit) {
    return (
      <div className="space-y-6 pb-20">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/einheiten" className="hover:text-gray-700 dark:hover:text-gray-300">
            Einheiten
          </Link>
        </nav>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error || 'Einheit nicht gefunden'}
            </p>
            <Button variant="secondary" onClick={() => router.push('/dashboard/einheiten')}>
              Zurueck zur Liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate condition summary
  const conditionSummary = calculateConditionSummary(rooms)

  // Prepare tenant data
  const tenantData = {
    name: unit.tenant_name,
    phone: unit.tenant_phone ?? null,
    email: unit.tenant_email ?? null,
    move_in_date: unit.tenant_move_in_date ?? null
  }
  const isVacant = unit.is_vacant || !unit.tenant_name

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/einheiten" className="hover:text-gray-700 dark:hover:text-gray-300">
          Einheiten
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{unit.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/einheiten')}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Zurueck"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {unit.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400 ml-8">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                {getUnitTypeLabel(unit.unit_type)}
              </span>
              {unit.floor !== null && (
                <span>{getFloorLabel(unit.floor)}</span>
              )}
              {unit.size_class && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full text-xs">
                  {unit.size_class}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/dashboard/wohnungen/${id}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Zur Detailansicht
            </Link>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Section */}
        <TenantSection tenant={tenantData} isVacant={isVacant} />

        {/* Condition Overview */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Zustand
            </h3>

            {rooms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Keine Raeume vorhanden
              </p>
            ) : (
              <div className="space-y-3">
                {/* Overall condition */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Gesamtzustand
                  </span>
                  {conditionSummary.overall_condition && (
                    <ConditionBadge condition={conditionSummary.overall_condition} size="md" />
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{conditionSummary.renovation_percentage}% renoviert</span>
                    <span>{conditionSummary.total} Raeume</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    {conditionSummary.new_rooms > 0 && (
                      <div
                        className="bg-green-500 h-full"
                        style={{ width: `${(conditionSummary.new_rooms / conditionSummary.total) * 100}%` }}
                      />
                    )}
                    {conditionSummary.partial_rooms > 0 && (
                      <div
                        className="bg-yellow-500 h-full"
                        style={{ width: `${(conditionSummary.partial_rooms / conditionSummary.total) * 100}%` }}
                      />
                    )}
                    {conditionSummary.old_rooms > 0 && (
                      <div
                        className="bg-red-500 h-full"
                        style={{ width: `${(conditionSummary.old_rooms / conditionSummary.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex items-center gap-4 text-xs">
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Room List */}
      <RoomList
        rooms={rooms}
        onEdit={handleEditRoom}
        onAdd={handleAddRoom}
      />

      {/* Room Form Modal */}
      {showRoomForm && (
        <RoomForm
          mode={editingRoom ? 'edit' : 'create'}
          room={editingRoom || undefined}
          unitId={id}
          onSave={handleSaveRoom}
          onCancel={handleCancelRoom}
        />
      )}
    </div>
  )
}
