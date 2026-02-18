'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { useMandate } from '@/contexts/MandateContext'
import type { Property, Building } from '@/types/database'

interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

interface GroupedMandate {
  mandateId: string
  mandateName: string
  properties: PropertyWithBuildings[]
}

export default function ObjektePage() {
  const { availableMandates } = useMandate()
  const [properties, setProperties] = useState<PropertyWithBuildings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchProperties() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error(`Fehler beim Laden: ${response.status}`)
      }
      const data = await response.json() as { properties: PropertyWithBuildings[] }
      setProperties(data.properties ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  // Group properties by mandate_id
  const grouped = groupByMandate(properties, availableMandates)

  // Single-mandate optimization (D4): detect unique mandate_ids
  const uniqueMandateIds = new Set(properties.map((p) => p.mandate_id ?? 'none'))
  const isSingleMandate = uniqueMandateIds.size <= 1

  return (
    <div className="p-4 md:p-6">
      <DashboardBreadcrumbs />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Objekte
      </h1>

      {isLoading && <ObjekteLoadingSkeleton />}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchProperties}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {!isLoading && !error && properties.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Keine Objekte vorhanden.
        </p>
      )}

      {!isLoading && !error && properties.length > 0 && (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.mandateId}>
              {/* Show mandate header only when multiple mandates exist (D4) */}
              {!isSingleMandate && (
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Mandat: {group.mandateName}
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

interface BuildingWithOptionalUnitCount extends Building {
  unit_count?: number
}

function PropertyCard({ property }: { property: PropertyWithBuildings }) {
  const buildingCount = property.buildings.length
  // unit_count is only present if the API includes it; sum safely
  const unitCount = (property.buildings as BuildingWithOptionalUnitCount[]).reduce(
    (sum, b) => sum + (b.unit_count ?? 0),
    0
  )
  const showUnits = (property.buildings as BuildingWithOptionalUnitCount[]).some(
    (b) => typeof b.unit_count === 'number'
  )

  return (
    <Link href={`/dashboard/objekte/${property.id}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer h-full">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {property.name}
        </p>
        {property.address && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {property.address}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {buildingCount} {buildingCount === 1 ? 'Gebäude' : 'Gebäude'}
          {showUnits && <> &middot; {unitCount} Einheiten</>}
        </p>
      </div>
    </Link>
  )
}

function groupByMandate(
  properties: PropertyWithBuildings[],
  availableMandates: Array<{ id: string; name: string }>
): GroupedMandate[] {
  const map = new Map<string, PropertyWithBuildings[]>()

  for (const property of properties) {
    const key = property.mandate_id ?? 'unknown'
    const existing = map.get(key) ?? []
    map.set(key, [...existing, property])
  }

  const groups: GroupedMandate[] = []
  for (const [mandateId, mandateProperties] of map.entries()) {
    const mandate = availableMandates.find((m) => m.id === mandateId)
    groups.push({
      mandateId,
      mandateName: mandate?.name ?? mandateId,
      properties: mandateProperties,
    })
  }

  // Sort groups by mandate name for consistent ordering
  groups.sort((a, b) => a.mandateName.localeCompare(b.mandateName))
  return groups
}

function ObjekteLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}
