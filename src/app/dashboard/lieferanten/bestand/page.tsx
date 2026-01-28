'use client'

/**
 * Inventory Overview Page
 *
 * Displays reorder alerts and current inventory levels for all properties.
 *
 * Path: /dashboard/lieferanten/bestand
 * Phase 20-02: Inventory Tracking
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReorderAlertList } from '@/components/suppliers/ReorderAlertList'
import { InventoryLevelCard } from '@/components/suppliers/InventoryLevelCard'
import { InventoryMovementForm } from '@/components/suppliers/InventoryMovementForm'
import type { ReorderAlert, CurrentInventoryLevel } from '@/types/suppliers'

interface Property {
  id: string
  name: string
}

interface InventoryLevelWithProperty extends CurrentInventoryLevel {
  property_name: string
}

export default function InventoryOverviewPage() {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([])
  const [levels, setLevels] = useState<InventoryLevelWithProperty[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch alerts, properties, and current levels in parallel
      const [alertsRes, propertiesRes, movementsRes] = await Promise.all([
        fetch('/api/reorder-alerts'),
        fetch('/api/properties'),
        fetch('/api/inventory-movements?limit=1000'),
      ])

      if (!alertsRes.ok || !propertiesRes.ok || !movementsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const alertsData = await alertsRes.json()
      const propertiesData = await propertiesRes.json()
      const movementsData = await movementsRes.json()

      // Build current levels from movements
      const propertyLevels = new Map<string, CurrentInventoryLevel>()

      for (const movement of movementsData.movements) {
        if (!propertyLevels.has(movement.property_id)) {
          propertyLevels.set(movement.property_id, {
            property_id: movement.property_id,
            movement_date: movement.movement_date,
            tank_level: movement.tank_level,
            tank_capacity: movement.tank_capacity,
            level_percentage: movement.level_percentage,
            daily_usage_rate: movement.daily_usage_rate,
            projected_empty_date: null, // Will be calculated if needed
          })
        }
      }

      // Join with property names
      const propertyMap = new Map(
        propertiesData.properties.map((p: Property) => [p.id, p.name])
      )

      const levelsWithNames = Array.from(propertyLevels.values()).map(level => ({
        ...level,
        property_name: propertyMap.get(level.property_id) || 'Unbekannt',
      }))

      setAlerts(alertsData.alerts || [])
      setLevels(levelsWithNames)
      setProperties(propertiesData.properties || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleFormSuccess() {
    setShowForm(false)
    fetchData()
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bestandsuebersicht</h1>
        <p className="text-gray-600 dark:text-gray-400">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bestandsuebersicht</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bestandsuebersicht</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Aktueller Pelletbestand und Nachbestellwarnungen
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/lieferanten">
            <Button variant="outline">Zurueck</Button>
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
            properties={properties}
            onSuccess={handleFormSuccess}
          />
        </Card>
      )}

      {/* Reorder Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Nachbestellwarnungen</h2>
          <ReorderAlertList alerts={alerts} />
        </Card>
      )}

      {/* Current Levels Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Liegenschaften ({levels.length})
        </h2>
        {levels.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            Keine Bestandsdaten vorhanden. Erfassen Sie die erste Ablesung.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map((level) => (
              <InventoryLevelCard
                key={level.property_id}
                level={level}
                propertyName={level.property_name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
