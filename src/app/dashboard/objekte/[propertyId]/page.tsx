'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import type { Property } from '@/types/database'

interface BuildingWithUnitCount {
  id: string
  name: string
  address: string | null
  property_id: string | null
  unit_count: number
  created_at: string
  updated_at: string
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = use(params)

  const [property, setProperty] = useState<Property | null>(null)
  const [buildings, setBuildings] = useState<BuildingWithUnitCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      const [propertyRes, buildingsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/buildings?property_id=${propertyId}`),
      ])

      if (!propertyRes.ok) {
        throw new Error(`Fehler beim Laden der Liegenschaft: ${propertyRes.status}`)
      }
      if (!buildingsRes.ok) {
        throw new Error(`Fehler beim Laden der Gebäude: ${buildingsRes.status}`)
      }

      const propertyData = await propertyRes.json() as { property: Property }
      const buildingsData = await buildingsRes.json() as { buildings: BuildingWithUnitCount[] }

      setProperty(propertyData.property ?? null)
      setBuildings(buildingsData.buildings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [propertyId])

  // Build breadcrumb label override: UUID → property name
  const breadcrumbLabels = property ? { [propertyId]: property.name } : undefined

  return (
    <div className="p-4 md:p-6">
      <DashboardBreadcrumbs labels={breadcrumbLabels} />

      {isLoading && <PropertyDetailLoadingSkeleton />}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {!isLoading && !error && property && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {property.name}
          </h1>
          {property.address && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {property.address}
            </p>
          )}

          {buildings.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Keine Gebäude vorhanden.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  propertyId={propertyId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BuildingCard({
  building,
  propertyId,
}: {
  building: BuildingWithUnitCount
  propertyId: string
}) {
  return (
    <Link href={`/dashboard/objekte/${propertyId}/${building.id}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer h-full">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {building.name}
        </p>
        {building.address && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {building.address}
          </p>
        )}
        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          {building.unit_count} {building.unit_count === 1 ? 'Einheit' : 'Einheiten'}
        </span>
      </div>
    </Link>
  )
}

function PropertyDetailLoadingSkeleton() {
  return (
    <>
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        ))}
      </div>
    </>
  )
}
