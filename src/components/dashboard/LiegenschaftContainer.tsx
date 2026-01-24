'use client'

import { useEffect, useState } from 'react'
import { useBuilding } from '@/contexts/BuildingContext'
import { PropertyDashboard } from '@/components/dashboard/PropertyDashboard'
import { PropertyDashboardClient } from '@/components/dashboard/PropertyDashboardClient'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import type { RoomCondition } from '@/types'

// Local type definition to avoid server module import
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

/**
 * Client-side container for Liegenschaft page
 * Uses BuildingContext for multi-property support
 */
export function LiegenschaftContainer() {
  const { selectedBuildingId, isLoading: buildingLoading } = useBuilding()
  const [units, setUnits] = useState<HeatmapUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedBuildingId || buildingLoading) return

    async function fetchUnits() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/buildings/${selectedBuildingId}/heatmap`)
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Daten')
        }

        const data = await response.json()
        setUnits(data.units || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
        setUnits([])
      } finally {
        setLoading(false)
      }
    }

    fetchUnits()
  }, [selectedBuildingId, buildingLoading])

  // Show loading while building context initializes
  if (buildingLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-12 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Show message if no building is selected
  if (!selectedBuildingId) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>Bitte waehlen Sie eine Liegenschaft aus.</p>
        <p className="text-sm mt-2">Nutzen Sie den Property-Selector in der Kopfzeile.</p>
      </div>
    )
  }

  // Show placeholder for "all buildings" view - full support coming in 14-03
  if (selectedBuildingId === 'all') {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">Alle Liegenschaften</p>
        <p className="text-sm mt-2">Globale Uebersicht wird eingerichtet...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm bg-red-100 dark:bg-red-900/20 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
        >
          Neu laden
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <DrilldownBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Liegenschaft' }
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Liegenschaftsuebersicht
        </h1>
      </div>

      {loading ? (
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <PropertyDashboardClient units={units}>
          <PropertyDashboard buildingId={selectedBuildingId} />
        </PropertyDashboardClient>
      )}
    </div>
  )
}
