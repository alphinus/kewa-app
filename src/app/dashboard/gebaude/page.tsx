'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent } from '@/components/ui/card'
import { BuildingGrid } from '@/components/building/BuildingGrid'
import { CommonAreasList } from '@/components/building/CommonAreasList'
import { UnitDetailModal } from '@/components/building/UnitDetailModal'
import type { UnitWithStats, UnitsResponse } from '@/types/database'

/**
 * Gebaeudeuebersicht page
 *
 * Displays:
 * - Building grid with floor-based apartment layout
 * - Common areas section below
 * - Unit detail modal on click
 *
 * KEWA can edit tenant name and visibility in modal.
 * Both roles can view and navigate to tasks.
 */
export default function GebaudePage() {
  const { session, loading: sessionLoading } = useSession()
  const [units, setUnits] = useState<UnitWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<UnitWithStats | null>(null)

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/units')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Einheiten')
      }

      const data: UnitsResponse = await response.json()
      setUnits(data.units)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  // Filter units by type
  const apartments = units.filter((u) => u.unit_type === 'apartment')
  const commonAreas = units.filter(
    (u) => u.unit_type === 'common_area' || u.unit_type === 'building'
  )

  // Handle unit click - open modal
  const handleUnitClick = (unit: UnitWithStats) => {
    setSelectedUnit(unit)
  }

  // Handle modal close
  const handleModalClose = () => {
    setSelectedUnit(null)
  }

  // Handle save from modal - update local state
  const handleModalSave = (updatedUnit: UnitWithStats) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u))
    )
  }

  // Determine if current user is internal (can edit)
  const isKewa = session.authenticated && (session.user?.isInternal ?? false)

  // Loading skeleton
  if (loading || sessionLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gebaeudeuebersicht
        </h1>

        {/* Building grid skeleton */}
        <div className="max-w-[600px] mx-auto space-y-1">
          {[4, 3, 2, 1, 0].map((floor) => (
            <div key={floor} className="flex items-center gap-2">
              <div className="w-10 sm:w-12 flex-shrink-0">
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className={`flex-1 grid gap-1 sm:gap-2 ${floor === 4 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {floor === 4 ? (
                  <div className="h-[60px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                ) : (
                  [0, 1, 2].map((pos) => (
                    <div
                      key={pos}
                      className="h-[60px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Common areas skeleton */}
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[48px] w-[120px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gebaeudeuebersicht
        </h1>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchUnits}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Erneut versuchen
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (units.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gebaeudeuebersicht
        </h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Keine Einheiten vorhanden
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Gebaeudeuebersicht
      </h1>

      {/* Building Grid - centered with max-width */}
      <div className="max-w-[600px] mx-auto">
        <BuildingGrid apartments={apartments} onUnitClick={handleUnitClick} />
      </div>

      {/* Common Areas - below grid with divider */}
      {commonAreas.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <CommonAreasList
            commonAreas={commonAreas}
            onUnitClick={handleUnitClick}
          />
        </div>
      )}

      {/* Unit Detail Modal */}
      <UnitDetailModal
        unit={selectedUnit}
        onClose={handleModalClose}
        onSave={handleModalSave}
        isKewa={isKewa}
      />
    </div>
  )
}
