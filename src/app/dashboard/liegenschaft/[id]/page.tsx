'use client'

/**
 * Property Detail Page
 *
 * Displays property/building info and delivery history.
 *
 * Path: /dashboard/liegenschaft/[id]
 * Phase 25-01: UX Polish (UXPL-03)
 * Phase 28-04: Entity caching integration
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { DeliveryList } from '@/components/suppliers/DeliveryList'
import { formatSwissDate } from '@/lib/suppliers/purchase-order-queries'
import { cacheEntityOnView } from '@/lib/db/operations'
import { useOfflineEntity } from '@/hooks/useOfflineEntity'
import { StalenessIndicator } from '@/components/StalenessIndicator'
import { useConnectivity } from '@/contexts/ConnectivityContext'

interface PageProps {
  params: Promise<{ id: string }>
}

interface Building {
  id: string
  name: string
  address: string | null
  property_id: string
  created_at: string
  updated_at: string
}

/**
 * Loading skeleton
 */
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <Card>
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LiegenschaftDetailPage({ params }: PageProps) {
  const { id } = use(params)

  const [building, setBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Offline entity caching
  const { isOnline } = useConnectivity()
  const offlineCache = useOfflineEntity('property', id)

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isValidId = uuidRegex.test(id)

  // Fetch building info
  useEffect(() => {
    if (!isValidId) return

    async function fetchBuilding() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/buildings/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Gebaeude nicht gefunden')
          }
          throw new Error('Fehler beim Laden der Gebaeudedaten')
        }

        const data = await response.json()
        setBuilding(data.building)

        // Cache entity on successful fetch
        await cacheEntityOnView('property', id, data.building)
      } catch (err) {
        // If offline and cached data available, use cache
        if (!isOnline && offlineCache.data) {
          setBuilding(offlineCache.data)
          setError(null)
        } else {
          setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchBuilding()
  }, [id, isValidId, isOnline, offlineCache.data])

  // Handle offline page load with cached data
  useEffect(() => {
    if (!isOnline && !building && offlineCache.data && !offlineCache.isLoading) {
      setBuilding(offlineCache.data)
      setLoading(false)
    }
  }, [isOnline, building, offlineCache.data, offlineCache.isLoading])

  // Invalid ID
  if (!isValidId) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">Ungueltiges ID-Format</p>
          <Link
            href="/dashboard/liegenschaft"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurueck zur Uebersicht
          </Link>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <PageSkeleton />
      </div>
    )
  }

  // Error
  if (error || !building) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">
            {error || 'Gebaeude nicht gefunden'}
          </p>
          <Link
            href="/dashboard/liegenschaft"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurueck zur Uebersicht
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/liegenschaft"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Liegenschaft
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{building.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {building.name}
          </h1>
          <StalenessIndicator cachedAt={offlineCache.cachedAt} />
        </div>
      </div>

      {/* Building Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gebaeudeinformationen
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
          </div>
        </CardContent>
      </Card>

      {/* Delivery History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Lieferhistorie
        </h2>
        <DeliveryList propertyId={building.property_id} />
      </div>

      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/liegenschaft"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurueck zur Uebersicht
        </Link>
      </div>
    </div>
  )
}
