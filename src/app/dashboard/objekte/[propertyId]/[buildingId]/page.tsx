'use client'

/**
 * Building Detail Page — D5
 *
 * Tabbed view for a building: Heatmap, Einheiten, Info.
 * URL-driven (params.buildingId), NOT BuildingContext.
 *
 * Path: /dashboard/objekte/[propertyId]/[buildingId]
 * Phase 39-03: Navigation Redesign — bottom drill-down levels
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { UnitDetailPanel } from '@/components/dashboard/UnitDetailPanel'
import { UnitList } from '@/components/units/UnitList'
import { UnitForm } from '@/components/units/UnitForm'
import { DeliveryList } from '@/components/suppliers/DeliveryList'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeatmapUnit } from '@/lib/dashboard/heatmap-queries'
import type { RoomCondition } from '@/types'
import type { Building, Unit } from '@/types/database'

// =============================================
// TYPES
// =============================================

interface HeatmapResponse {
  buildingId: string
  buildingName: string
  units: HeatmapUnit[]
}

interface Property {
  id: string
  name: string
  address: string | null
}

type TabId = 'heatmap' | 'einheiten' | 'info'

type UnitWithRooms = Unit & { rooms?: { id: string }[] }

// =============================================
// CONSTANTS
// =============================================

const FLOOR_CONFIG = [
  { label: 'Dach', floor: 4, cols: 1 },
  { label: '3.OG', floor: 3, cols: 3 },
  { label: '2.OG', floor: 2, cols: 3 },
  { label: '1.OG', floor: 1, cols: 3 },
  { label: 'EG', floor: 0, cols: 3 },
] as const

const POSITION_ORDER = ['links', 'mitte', 'rechts'] as const

// =============================================
// HELPER FUNCTIONS
// =============================================

function getUnitByFloorPosition(units: HeatmapUnit[], floor: number, position: string): HeatmapUnit | null {
  return units.find(
    (u) => u.floor === floor && u.position?.toLowerCase() === position.toLowerCase()
  ) || null
}

function getUnitByFloor(units: HeatmapUnit[], floor: number): HeatmapUnit | null {
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

// =============================================
// PAGE COMPONENT
// =============================================

export default function BuildingDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string; buildingId: string }>
}) {
  const router = useRouter()
  const { propertyId, buildingId } = use(params)

  // Entity data
  const [building, setBuilding] = useState<Building | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [heatmapUnits, setHeatmapUnits] = useState<HeatmapUnit[]>([])
  const [units, setUnits] = useState<UnitWithRooms[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('heatmap')

  // Heatmap interaction
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  // Unit form state (Einheiten tab)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const selectedUnit = selectedUnitId
    ? heatmapUnits.find((u) => u.id === selectedUnitId) || null
    : null

  // =============================================
  // DATA FETCHING
  // =============================================

  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      const [buildingRes, propertyRes, heatmapRes, unitsRes] = await Promise.all([
        fetch(`/api/buildings/${buildingId}`),
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/buildings/${buildingId}/heatmap`),
        fetch(`/api/units?building_id=${buildingId}`),
      ])

      if (!buildingRes.ok) {
        throw new Error(`Fehler beim Laden des Gebäudes: ${buildingRes.status}`)
      }
      if (!propertyRes.ok) {
        throw new Error(`Fehler beim Laden der Liegenschaft: ${propertyRes.status}`)
      }
      if (!heatmapRes.ok) {
        throw new Error(`Fehler beim Laden der Heatmap: ${heatmapRes.status}`)
      }

      const buildingData = await buildingRes.json() as { building: Building }
      const propertyData = await propertyRes.json() as { property: Property }
      const heatmapData = await heatmapRes.json() as HeatmapResponse

      setBuilding(buildingData.building ?? null)
      setProperty(propertyData.property ?? null)
      setHeatmapUnits(heatmapData.units ?? [])

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json() as { units: UnitWithRooms[] }
        const filtered = (unitsData.units ?? []).filter(
          (u) => u.unit_type === 'apartment' || u.unit_type === 'common_area'
        )
        setUnits(filtered)
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
  }, [buildingId, propertyId])

  // Clear selected unit on building change
  useEffect(() => {
    setSelectedUnitId(null)
  }, [buildingId])

  // =============================================
  // HANDLERS
  // =============================================

  function handleUnitSave(savedUnit: Unit) {
    if (editingUnit) {
      setUnits((prev) => prev.map((u) => (u.id === savedUnit.id ? savedUnit : u)))
    } else {
      setUnits((prev) => [...prev, savedUnit])
    }
    setShowUnitForm(false)
    setEditingUnit(null)
  }

  // =============================================
  // BREADCRUMB LABELS
  // =============================================

  const breadcrumbLabels = {
    ...(property ? { [propertyId]: property.name } : {}),
    ...(building ? { [buildingId]: building.name } : {}),
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
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !building) {
    return (
      <div className="p-4 md:p-6">
        <DashboardBreadcrumbs labels={breadcrumbLabels} />
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">
            {error || 'Gebäude nicht gefunden'}
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

  // =============================================
  // MAIN RENDER
  // =============================================

  // Calculate summary stats from heatmap units
  const totalRooms = heatmapUnits.reduce((sum, u) => sum + u.total_rooms, 0)
  const renovatedRooms = heatmapUnits.reduce((sum, u) => sum + u.new_rooms, 0)
  const avgRenovation = heatmapUnits.length > 0
    ? Math.round(
        heatmapUnits.reduce((sum, u) => sum + (u.renovation_percentage || 0), 0) /
          heatmapUnits.length
      )
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4">
      <DashboardBreadcrumbs labels={breadcrumbLabels} />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {building.name}
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-6">
        {(['heatmap', 'einheiten', 'info'] as TabId[]).map((tab) => {
          const labels: Record<TabId, string> = {
            heatmap: 'Heatmap',
            einheiten: 'Einheiten',
            info: 'Info',
          }
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* ---- HEATMAP TAB ---- */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Wohnungen" value={heatmapUnits.length} />
            <StatCard
              label="Renovierungsgrad"
              value={`${avgRenovation}%`}
              color="green"
            />
            <StatCard label="Räume gesamt" value={totalRooms} />
            <StatCard label="Räume renoviert" value={`${renovatedRooms}/${totalRooms}`} />
          </div>

          {/* Heatmap grid */}
          {heatmapUnits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Keine Einheiten vorhanden
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {FLOOR_CONFIG.map(({ label, floor, cols }) => (
                <div key={floor} className="flex items-center gap-2">
                  <div className="w-10 sm:w-12 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex-1 grid gap-1 sm:gap-2',
                      cols === 1 ? 'grid-cols-1' : 'grid-cols-3'
                    )}
                  >
                    {cols === 1 ? (
                      (() => {
                        const unit = getUnitByFloor(heatmapUnits, floor)
                        if (!unit) return <EmptyCell />
                        return (
                          <UnitCell
                            unit={unit}
                            onClick={() => setSelectedUnitId(unit.id)}
                          />
                        )
                      })()
                    ) : (
                      POSITION_ORDER.map((position) => {
                        const unit = getUnitByFloorPosition(heatmapUnits, floor, position)
                        return unit ? (
                          <UnitCell
                            key={unit.id}
                            unit={unit}
                            onClick={() => setSelectedUnitId(unit.id)}
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
          )}

          {/* Unit detail panel */}
          <UnitDetailPanel
            unit={selectedUnit}
            onClose={() => setSelectedUnitId(null)}
          />
        </div>
      )}

      {/* ---- EINHEITEN TAB ---- */}
      {activeTab === 'einheiten' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Einheiten
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingUnit(null)
                setShowUnitForm(true)
              }}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Neu
            </button>
          </div>

          <UnitList
            units={units}
            onView={(unit) =>
              router.push(`/dashboard/objekte/${propertyId}/${buildingId}/${unit.id}`)
            }
            onEdit={(unit) => {
              setEditingUnit(unit)
              setShowUnitForm(true)
            }}
          />

          {showUnitForm && (
            <UnitForm
              mode={editingUnit ? 'edit' : 'create'}
              unit={editingUnit || undefined}
              buildingId={buildingId}
              onSave={handleUnitSave}
              onCancel={() => {
                setShowUnitForm(false)
                setEditingUnit(null)
              }}
            />
          )}
        </div>
      )}

      {/* ---- INFO TAB ---- */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Building info card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Gebäudeinformationen
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {building.name}
                  </p>
                </div>
                {building.address && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Adresse</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {building.address}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Liegenschaft</p>
                  <Link
                    href={`/dashboard/objekte/${propertyId}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {property?.name || propertyId}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Erstellt</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(building.created_at).toLocaleDateString('de-CH')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aktualisiert</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(building.updated_at).toLocaleDateString('de-CH')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery history */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Lieferhistorie
            </h2>
            <DeliveryList propertyId={building.property_id ?? undefined} />
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================
// HELPER COMPONENTS
// =============================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: 'green' | 'blue' | 'amber'
}) {
  const colorClasses: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${
          color ? colorClasses[color] : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function UnitCell({
  unit,
  onClick,
}: {
  unit: HeatmapUnit
  onClick: () => void
}) {
  const conditionColors: Record<RoomCondition, string> = {
    new: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
    partial: 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700',
    old: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700',
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

function EmptyCell() {
  return (
    <div
      className={cn(
        'min-h-[60px] rounded-xl',
        'border border-dashed border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-900/50',
        'flex items-center justify-center'
      )}
    >
      <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
    </div>
  )
}
