/**
 * Einheiten (Units) Dashboard Page
 *
 * Building-scoped unit list with create/edit functionality.
 * Uses BuildingContext to filter units by selected building.
 *
 * Phase 15-03: Unit Management UI
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBuilding } from '@/contexts/BuildingContext'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import { UnitList } from '@/components/units/UnitList'
import { UnitForm } from '@/components/units/UnitForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'
import type { Unit } from '@/types/database'

type UnitWithRooms = Unit & { rooms?: { id: string }[] }

export default function EinheitenPage() {
  const router = useRouter()
  const { selectedBuildingId, isAllSelected, isLoading: buildingLoading } = useBuilding()

  // Data state
  const [units, setUnits] = useState<UnitWithRooms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  /**
   * Fetch units for the selected building
   */
  const fetchUnits = useCallback(async (buildingId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/units?building_id=${buildingId}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Einheiten')
      }

      const data = await response.json()
      // Filter to apartments and common areas only (not parking)
      const filteredUnits = (data.units || []).filter(
        (u: Unit) => u.unit_type === 'apartment' || u.unit_type === 'common_area'
      )
      setUnits(filteredUnits)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setUnits([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch units when building selection changes
  useEffect(() => {
    if (buildingLoading) return

    if (!selectedBuildingId || selectedBuildingId === 'all') {
      setUnits([])
      setLoading(false)
      return
    }

    fetchUnits(selectedBuildingId)
  }, [buildingLoading, selectedBuildingId, fetchUnits])

  /**
   * Handle create button click
   */
  function handleCreateClick() {
    setEditingUnit(null)
    setShowForm(true)
  }

  /**
   * Handle edit button click on unit card
   */
  function handleEditClick(unit: Unit) {
    setEditingUnit(unit)
    setShowForm(true)
  }

  /**
   * Handle view button click on unit card
   */
  function handleViewClick(unit: Unit) {
    router.push(`/dashboard/wohnungen/${unit.id}`)
  }

  /**
   * Handle form save - add or update unit in list
   */
  function handleSave(savedUnit: Unit) {
    if (editingUnit) {
      // Update existing unit in list
      setUnits(prev => prev.map(u => u.id === savedUnit.id ? savedUnit : u))
    } else {
      // Add new unit to list
      setUnits(prev => [...prev, savedUnit])
    }
    setShowForm(false)
    setEditingUnit(null)
  }

  /**
   * Handle form cancel
   */
  function handleCancel() {
    setShowForm(false)
    setEditingUnit(null)
  }

  // Show prompt when "Alle" is selected or no building selected
  if (!buildingLoading && (isAllSelected || !selectedBuildingId)) {
    return (
      <div className="space-y-6 pb-20">
        <DrilldownBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Einheiten' }
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Einheiten
          </h1>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bitte waehlen Sie eine Liegenschaft aus
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Die Einheiten-Ansicht zeigt die Wohnungen eines einzelnen Gebaeudes.
              Waehlen Sie oben eine Liegenschaft aus, um die Einheiten zu sehen.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (buildingLoading || loading) {
    return (
      <div className="space-y-6 pb-20">
        <DrilldownBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Einheiten' }
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Einheiten
          </h1>
        </div>

        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-36 bg-gray-200 dark:bg-gray-700 rounded-lg"
              />
            ))}
          </div>
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
            { label: 'Einheiten' }
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Einheiten
          </h1>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => selectedBuildingId && fetchUnits(selectedBuildingId)}
            >
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main content - unit list
  return (
    <div className="space-y-6 pb-20">
      <DrilldownBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Einheiten' }
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Einheiten
        </h1>

        <Button onClick={handleCreateClick}>
          <Plus className="w-5 h-5 mr-1" />
          Neu
        </Button>
      </div>

      <UnitList
        units={units}
        onEdit={handleEditClick}
        onView={handleViewClick}
      />

      {/* Unit Form Modal */}
      {showForm && selectedBuildingId && selectedBuildingId !== 'all' && (
        <UnitForm
          mode={editingUnit ? 'edit' : 'create'}
          unit={editingUnit || undefined}
          buildingId={selectedBuildingId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
