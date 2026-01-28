'use client'

/**
 * InventoryMovementForm Component
 *
 * Form for recording tank readings and inventory adjustments.
 *
 * Phase 20-02: Inventory Tracking
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { CreateInventoryMovementInput } from '@/types/suppliers'

interface Property {
  id: string
  name: string
}

interface InventoryMovementFormProps {
  /** List of properties for dropdown */
  properties: Property[]
  /** Callback after successful save */
  onSuccess: () => void
  /** Optional initial values for editing */
  initialValues?: Partial<CreateInventoryMovementInput>
}

export function InventoryMovementForm({
  properties,
  onSuccess,
  initialValues,
}: InventoryMovementFormProps) {
  // Form fields
  const [propertyId, setPropertyId] = useState(initialValues?.property_id || '')
  const [movementDate, setMovementDate] = useState(
    initialValues?.movement_date || new Date().toISOString().split('T')[0]
  )
  const [tankLevel, setTankLevel] = useState(
    initialValues?.tank_level?.toString() || ''
  )
  const [tankCapacity, setTankCapacity] = useState(
    initialValues?.tank_capacity?.toString() || ''
  )
  const [movementType, setMovementType] = useState<'reading' | 'adjustment'>(
    (initialValues?.movement_type as 'reading' | 'adjustment') || 'reading'
  )
  const [notes, setNotes] = useState(initialValues?.notes || '')

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!propertyId) {
      setError('Liegenschaft ist erforderlich')
      return
    }

    if (!tankLevel) {
      setError('Tankstand ist erforderlich')
      return
    }

    const tankLevelNum = parseFloat(tankLevel)
    const tankCapacityNum = tankCapacity ? parseFloat(tankCapacity) : undefined

    if (isNaN(tankLevelNum)) {
      setError('Tankstand muss eine Zahl sein')
      return
    }

    if (tankCapacityNum !== undefined && isNaN(tankCapacityNum)) {
      setError('Tankkapazitaet muss eine Zahl sein')
      return
    }

    if (tankCapacityNum !== undefined && tankLevelNum > tankCapacityNum) {
      setError('Tankstand kann nicht groesser als Kapazitaet sein')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/inventory-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          movement_type: movementType,
          movement_date: movementDate,
          tank_level: tankLevelNum,
          tank_capacity: tankCapacityNum,
          notes: notes.trim() || undefined,
        } satisfies CreateInventoryMovementInput),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Liegenschaft <span className="text-red-500">*</span>
        </label>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          disabled={loading}
        >
          <option value="">Liegenschaft waehlen...</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Typ <span className="text-red-500">*</span>
        </label>
        <select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value as 'reading' | 'adjustment')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          disabled={loading}
        >
          <option value="reading">Ablesung</option>
          <option value="adjustment">Korrektur</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Datum <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={movementDate}
          onChange={(e) => setMovementDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Tankstand (Tonnen) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={tankLevel}
          onChange={(e) => setTankLevel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          placeholder="z.B. 3.5"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Tankkapazitaet (Tonnen)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={tankCapacity}
          onChange={(e) => setTankCapacity(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          placeholder="z.B. 10.0"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notizen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          placeholder="Zusaetzliche Bemerkungen..."
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Speichern...' : 'Speichern'}
        </Button>
      </div>
    </form>
  )
}
