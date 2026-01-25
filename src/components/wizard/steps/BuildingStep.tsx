'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface BuildingStepProps {
  propertyId: string
  initialData?: { id: string; name: string }
  onComplete: (data: { id: string; name: string }) => void
  onBack: () => void
}

/**
 * Building creation step for setup wizard
 */
export function BuildingStep({ propertyId, initialData, onComplete, onBack }: BuildingStepProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [floors, setFloors] = useState('4')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Gebäudename ist erforderlich')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          property_id: propertyId,
          floors: parseInt(floors) || 4,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const { building } = await response.json()
      onComplete({ id: building.id, name: building.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Gebäudename *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Haus A oder Hauptgebäude"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Anzahl Stockwerke
        </label>
        <select
          value={floors}
          onChange={(e) => setFloors(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" fullWidth onClick={onBack} disabled={loading}>
          Zurück
        </Button>
        <Button type="submit" fullWidth loading={loading}>
          Weiter
        </Button>
      </div>
    </form>
  )
}
