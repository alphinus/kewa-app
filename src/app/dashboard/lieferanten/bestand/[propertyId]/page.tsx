'use client'

/**
 * Property Inventory Detail Page
 *
 * Displays current level and movement history for a specific property.
 *
 * Path: /dashboard/lieferanten/bestand/[propertyId]
 * Phase 20-02: Inventory Tracking
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InventoryLevelCard } from '@/components/suppliers/InventoryLevelCard'
import { InventoryMovementForm } from '@/components/suppliers/InventoryMovementForm'
import type { InventoryMovement, CurrentInventoryLevel } from '@/types/suppliers'

interface Property {
  id: string
  name: string
}

interface PropertyInventoryDetailPageProps {
  params: Promise<{ propertyId: string }>
}

/**
 * Format date for display (Swiss locale)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Get German label for movement type
 */
function getMovementTypeLabel(type: string): string {
  switch (type) {
    case 'delivery':
      return 'Lieferung'
    case 'reading':
      return 'Ablesung'
    case 'adjustment':
      return 'Korrektur'
    default:
      return type
  }
}

export default function PropertyInventoryDetailPage({
  params,
}: PropertyInventoryDetailPageProps) {
  const { propertyId } = use(params)

  const [property, setProperty] = useState<Property | null>(null)
  const [currentLevel, setCurrentLevel] = useState<CurrentInventoryLevel | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch property and movements in parallel
      const [propertyRes, movementsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/inventory-movements?property_id=${propertyId}&limit=100`),
      ])

      if (!propertyRes.ok) {
        throw new Error('Property not found')
      }

      if (!movementsRes.ok) {
        throw new Error('Failed to fetch movements')
      }

      const propertyData = await propertyRes.json()
      const movementsData = await movementsRes.json()

      setProperty(propertyData.property)
      setMovements(movementsData.movements || [])

      // Build current level from latest movement
      if (movementsData.movements && movementsData.movements.length > 0) {
        const latest = movementsData.movements[0]
        setCurrentLevel({
          property_id: propertyId,
          movement_date: latest.movement_date,
          tank_level: latest.tank_level,
          tank_capacity: latest.tank_capacity,
          level_percentage: latest.level_percentage,
          daily_usage_rate: latest.daily_usage_rate,
          projected_empty_date: null, // Would need calculation
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [propertyId])

  function handleFormSuccess() {
    setShowForm(false)
    fetchData()
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bestandsverlauf</h1>
        <p className="text-gray-600 dark:text-gray-400">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bestandsverlauf</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
        <Link href="/dashboard/lieferanten/bestand" className="mt-4 inline-block">
          <Button variant="secondary">Zurück</Button>
        </Link>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bestandsverlauf</h1>
        <p className="text-gray-600 dark:text-gray-400">Liegenschaft nicht gefunden</p>
        <Link href="/dashboard/lieferanten/bestand" className="mt-4 inline-block">
          <Button variant="secondary">Zurück</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{property.name} — Bestandsverlauf</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Aktueller Stand und historische Ablesungen
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/lieferanten/bestand">
            <Button variant="secondary">Zurück</Button>
          </Link>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showForm ? 'Abbrechen' : 'Ablesung erfassen'}
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Neue Ablesung erfassen</h2>
          <InventoryMovementForm
            properties={[property]}
            onSuccess={handleFormSuccess}
            initialValues={{ property_id: propertyId }}
          />
        </Card>
      )}

      {/* Current Level */}
      {currentLevel && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Aktueller Stand</h2>
          <div className="max-w-md">
            <InventoryLevelCard level={currentLevel} propertyName={property.name} />
          </div>
        </div>
      )}

      {/* Movement History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Verlauf ({movements.length})
        </h2>
        {movements.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            Keine Bewegungen vorhanden. Erfassen Sie die erste Ablesung.
          </p>
        ) : movements.length < 2 ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-3 rounded mb-4">
            Mindestens 2 Ablesungen erforderlich für Verbrauchsberechnung.
          </div>
        ) : null}

        {movements.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Typ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Stand (t)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Verbrauch (t)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Verbrauch/Tag (t)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Notizen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-sm">
                        {formatDate(movement.movement_date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getMovementTypeLabel(movement.movement_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {movement.tank_level.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {movement.consumption_amount !== null
                          ? movement.consumption_amount.toFixed(2)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {movement.daily_usage_rate !== null
                          ? movement.daily_usage_rate.toFixed(3)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {movement.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
