/**
 * Liegenschaft Dashboard Page
 *
 * Property overview with building heatmap and parking status.
 * KEWA-only access for full property visualization.
 * Uses BuildingContext for building selection.
 *
 * Phase 14-05: Wire dashboard to building context
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBuilding } from '@/contexts/BuildingContext'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import { UnitDetailPanel } from '@/components/dashboard/UnitDetailPanel'
import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomCondition } from '@/types'
import type { ParkingSpot } from '@/types/database'

interface HeatmapUnit {
  id: string
  name: string
  floor: number | null
  position: string | null
  unit_type: string
  tenant_name: string | null
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
  rooms: Array<{
    id: string
    name: string
    room_type: string
    condition: RoomCondition
  }>
}

interface HeatmapResponse {
  buildingId: string
  buildingName: string
  units: HeatmapUnit[]
}

interface DashboardSummary {
  totalUnits: number
  averageRenovationPercent: number
  activeProjects: number
  renovatedRooms: number
  totalRooms: number
}

const FLOOR_CONFIG = [
  { label: 'Dach', floor: 4, cols: 1 },
  { label: '3.OG', floor: 3, cols: 3 },
  { label: '2.OG', floor: 2, cols: 3 },
  { label: '1.OG', floor: 1, cols: 3 },
  { label: 'EG', floor: 0, cols: 3 },
] as const

const POSITION_ORDER = ['links', 'mitte', 'rechts'] as const

export default function LiegenschaftPage() {
  const { selectedBuildingId, isAllSelected, isLoading: buildingLoading } = useBuilding()

  const [units, setUnits] = useState<HeatmapUnit[]>([])
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([])
  const [buildingName, setBuildingName] = useState<string>('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const selectedUnit = selectedUnitId
    ? units.find(u => u.id === selectedUnitId) || null
    : null

  // Fetch heatmap and parking data for selected building
  const fetchBuildingData = useCallback(async (buildingId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch heatmap data and units (which includes parking) in parallel
      const [heatmapRes, unitsRes] = await Promise.all([
        fetch(`/api/buildings/${buildingId}/heatmap`),
        fetch('/api/units')
      ])

      if (!heatmapRes.ok) {
        throw new Error('Fehler beim Laden der Heatmap-Daten')
      }

      const heatmapData: HeatmapResponse = await heatmapRes.json()
      setUnits(heatmapData.units)
      setBuildingName(heatmapData.buildingName)

      // Extract parking spots from units response
      if (unitsRes.ok) {
        const unitsData = await unitsRes.json()
        const parkingUnits = (unitsData.units || []).filter(
          (u: { unit_type: string; building_id?: string }) =>
            u.unit_type === 'parking_spot'
        )
        setParkingSpots(parkingUnits)
      }

      // Calculate summary from units
      const totalRooms = heatmapData.units.reduce((sum, u) => sum + u.total_rooms, 0)
      const renovatedRooms = heatmapData.units.reduce((sum, u) => sum + u.new_rooms, 0)
      const avgRenovation = heatmapData.units.length > 0
        ? Math.round(heatmapData.units.reduce((sum, u) => sum + (u.renovation_percentage || 0), 0) / heatmapData.units.length)
        : 0

      setSummary({
        totalUnits: heatmapData.units.length,
        averageRenovationPercent: avgRenovation,
        activeProjects: 0,
        renovatedRooms,
        totalRooms
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setUnits([])
      setParkingSpots([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch when building selection changes
  useEffect(() => {
    if (buildingLoading) return

    if (!selectedBuildingId || selectedBuildingId === 'all') {
      setUnits([])
      setParkingSpots([])
      setSummary(null)
      setLoading(false)
      return
    }

    fetchBuildingData(selectedBuildingId)
  }, [buildingLoading, selectedBuildingId, fetchBuildingData])

  // Clear selected unit when building changes
  useEffect(() => {
    setSelectedUnitId(null)
  }, [selectedBuildingId])

  const handleUnitClick = useCallback((unitId: string) => {
    setSelectedUnitId(unitId)
  }, [])

  // Helper functions for heatmap
  function getUnitByFloorPosition(floor: number, position: string): HeatmapUnit | null {
    return units.find(
      (u) => u.floor === floor && u.position?.toLowerCase() === position.toLowerCase()
    ) || null
  }

  function getUnitByFloor(floor: number): HeatmapUnit | null {
    return units.find((u) => u.floor === floor) || null
  }

  function getConditionColor(condition: RoomCondition | null): string {
    switch (condition) {
      case 'new': return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700'
      case 'partial': return 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
      case 'old': return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700'
      default: return 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
    }
  }

  // Show prompt when "Alle" is selected
  if (!buildingLoading && isAllSelected) {
    return (
      <div className="space-y-6 pb-20">
        <DrilldownBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Liegenschaft' }
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Liegenschaftsübersicht
        </h1>

        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bitte wählen Sie ein Gebäude
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Die Heatmap-Ansicht zeigt die Details eines einzelnen Gebäudes.
              Wählen Sie oben ein Gebäude aus, um die Übersicht zu sehen.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while building context initializes
  if (buildingLoading || loading) {
    return (
      <div className="space-y-6 pb-20">
        <DrilldownBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Liegenschaft' }
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Liegenschaftsübersicht
        </h1>

        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6 pb-20">
        <DrilldownBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Liegenschaft' }
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Liegenschaftsübersicht
        </h1>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show heatmap for selected building
  return (
    <div className="space-y-6 pb-20">
      <DrilldownBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Liegenschaft' }
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {buildingName || 'Liegenschaftsübersicht'}
      </h1>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Wohnungen" value={summary.totalUnits} />
          <StatCard
            label="Renovierungsgrad"
            value={`${summary.averageRenovationPercent}%`}
            color="green"
          />
          <StatCard
            label="Aktive Projekte"
            value={summary.activeProjects}
            color="blue"
          />
          <StatCard
            label="Räume renoviert"
            value={`${summary.renovatedRooms}/${summary.totalRooms}`}
          />
        </div>
      )}

      {/* Building + Parking Layout */}
      <div className="flex gap-4">
        {/* Building Heatmap */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Gebäude
          </h3>
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
                    // Dach floor
                    (() => {
                      const unit = getUnitByFloor(floor)
                      if (!unit) return <EmptyCell />
                      return (
                        <UnitCell
                          unit={unit}
                          onClick={() => handleUnitClick(unit.id)}
                        />
                      )
                    })()
                  ) : (
                    POSITION_ORDER.map((position) => {
                      const unit = getUnitByFloorPosition(floor, position)
                      return unit ? (
                        <UnitCell
                          key={unit.id}
                          unit={unit}
                          onClick={() => handleUnitClick(unit.id)}
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
        </div>

        {/* Parking Section */}
        <div className="w-24 sm:w-32 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Parkplaetze
          </h3>
          {parkingSpots.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
              Keine Parkplaetze
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {parkingSpots.map((spot) => (
                <ParkingCard key={spot.id} spot={spot} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unit Detail Panel */}
      <UnitDetailPanel
        unit={selectedUnit}
        onClose={() => setSelectedUnitId(null)}
      />
    </div>
  )
}

/**
 * StatCard displays a single statistic
 */
function StatCard({
  label,
  value,
  color
}: {
  label: string
  value: string | number
  color?: 'green' | 'blue' | 'amber'
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ? colorClasses[color] : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  )
}

/**
 * Unit cell in the heatmap grid
 */
function UnitCell({ unit, onClick }: { unit: HeatmapUnit; onClick: () => void }) {
  const conditionColors: Record<RoomCondition, string> = {
    new: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
    partial: 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700',
    old: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700'
  }

  const colorClass = unit.overall_condition
    ? conditionColors[unit.overall_condition]
    : 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600'

  return (
    <button
      type="button"
      onClick={onClick}
      data-unit-id={unit.id}
      className={cn(
        'min-h-[60px] p-2 rounded-xl border-2 cursor-pointer',
        'transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        colorClass
      )}
    >
      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
        {unit.name}
      </p>
      {unit.tenant_name && (
        <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
          {unit.tenant_name}
        </p>
      )}
      {unit.total_rooms > 0 && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {unit.new_rooms}/{unit.total_rooms}
        </p>
      )}
    </button>
  )
}

/**
 * Empty cell placeholder
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

/**
 * Parking spot card
 */
function ParkingCard({ spot }: { spot: ParkingSpot }) {
  const statusStyles: Record<string, string> = {
    free: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    occupied: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    maintenance: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
  }

  const statusLabels: Record<string, string> = {
    free: 'Frei',
    occupied: 'Belegt',
    maintenance: 'Wartung'
  }

  const statusBadgeStyles: Record<string, string> = {
    free: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    occupied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  }

  return (
    <div className={cn(
      'p-2 rounded-lg border',
      statusStyles[spot.parking_status] || statusStyles.free
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          P{spot.parking_number}
        </span>
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          statusBadgeStyles[spot.parking_status] || statusBadgeStyles.free
        )}>
          {statusLabels[spot.parking_status] || 'Unbekannt'}
        </span>
      </div>
      {spot.tenant_name && spot.parking_status === 'occupied' && (
        <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate mt-1">
          {spot.tenant_name}
        </p>
      )}
    </div>
  )
}
