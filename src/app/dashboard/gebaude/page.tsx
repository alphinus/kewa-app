'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent } from '@/components/ui/card'
import type { UnitWithStats, UnitsResponse } from '@/types/database'
import type { UnitType } from '@/types'

/**
 * Gebaude (Units) overview page
 * Shows all units grouped by type with task statistics
 */
export default function GebaudePage() {
  const router = useRouter()
  const { session } = useSession()
  const [units, setUnits] = useState<UnitWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Group units by type
  const apartments = units
    .filter(u => u.unit_type === 'apartment')
    .sort((a, b) => {
      // Sort by floor descending, then by position/name
      const floorDiff = (b.floor ?? -1) - (a.floor ?? -1)
      if (floorDiff !== 0) return floorDiff
      return a.name.localeCompare(b.name)
    })

  const commonAreas = units.filter(u => u.unit_type === 'common_area')
  const buildingWide = units.filter(u => u.unit_type === 'building')

  const handleUnitClick = (unitId: string) => {
    router.push(`/dashboard/aufgaben?unit_id=${unitId}`)
  }

  // Loading state with skeleton cards
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gebaude
        </h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gebaude
        </h1>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchUnits}
              className="mt-2 text-blue-500 underline"
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
          Gebaude
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
        Gebaude
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Uebersicht aller Einheiten
      </p>

      {/* Apartments section */}
      {apartments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Wohnungen
          </h2>
          <div className="grid gap-3">
            {apartments.map(unit => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onClick={() => handleUnitClick(unit.id)}
                showTenant={session.user?.role === 'kewa'}
              />
            ))}
          </div>
        </section>
      )}

      {/* Common areas section */}
      {commonAreas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Gemeinschaftsflaechen
          </h2>
          <div className="grid gap-3">
            {commonAreas.map(unit => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onClick={() => handleUnitClick(unit.id)}
                showTenant={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Building-wide section */}
      {buildingWide.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Gesamtgebaude
          </h2>
          <div className="grid gap-3">
            {buildingWide.map(unit => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onClick={() => handleUnitClick(unit.id)}
                showTenant={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface UnitCardProps {
  unit: UnitWithStats
  onClick: () => void
  showTenant: boolean
}

/**
 * Individual unit card with task count badge
 */
function UnitCard({ unit, onClick, showTenant }: UnitCardProps) {
  const openTasks = unit.open_tasks_count

  // Badge color based on open task count
  const getBadgeClasses = () => {
    if (openTasks === 0) {
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    }
    if (openTasks <= 2) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    }
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }

  return (
    <Card
      className="cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {unit.name}
            </p>
            {showTenant && unit.tenant_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unit.tenant_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-sm font-medium rounded-full ${getBadgeClasses()}`}
            >
              {openTasks === 0
                ? 'Keine'
                : `${openTasks} offen`}
            </span>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
