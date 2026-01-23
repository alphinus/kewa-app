'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Plus, X, ArrowLeft } from 'lucide-react'
import { PropertyBuilder } from '@/components/admin/PropertyBuilder'
import type { Property, Building } from '@/types/database'

interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

type ViewMode = 'list' | 'create' | 'builder'

/**
 * Property Management Page
 *
 * Allows admins to:
 * - View all properties with their buildings
 * - Create new properties with buildings and units
 * - Navigate to building details with drag & drop builder
 *
 * Phase 13: Partner-Modul - Property & Building Management
 */
export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyWithBuildings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Liegenschaften')
      }

      const data = await response.json()
      setProperties(data.properties || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleBuildingClick = useCallback((building: Building) => {
    setSelectedBuilding(building)
    setViewMode('builder')
  }, [])

  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setSelectedBuilding(null)
    fetchProperties()
  }, [fetchProperties])

  // Show PropertyBuilder when a building is selected
  if (viewMode === 'builder' && selectedBuilding) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="secondary" onClick={handleBackToList}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Zurueck zu Liegenschaften
          </Button>
        </div>
        <PropertyBuilder
          building={selectedBuilding}
          onSave={fetchProperties}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Laden...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      {/* Create Form Modal */}
      {showCreateForm && (
        <CreatePropertyForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false)
            fetchProperties()
          }}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Liegenschaften
          </h1>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Neue Liegenschaft
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Liegenschaften und Gebaeude verwalten
        </p>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              Keine Liegenschaften vorhanden
            </p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Erste Liegenschaft erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onBuildingClick={handleBuildingClick}
              onRefresh={fetchProperties}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Create Property Form Modal
 */
interface CreatePropertyFormProps {
  onClose: () => void
  onCreated: () => void
}

function CreatePropertyForm({ onClose, onCreated }: CreatePropertyFormProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      // Create property
      const propResponse = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          description: description.trim() || null
        })
      })

      if (!propResponse.ok) {
        throw new Error('Fehler beim Erstellen der Liegenschaft')
      }

      const { property } = await propResponse.json()

      // Create initial building if name provided
      if (buildingName.trim()) {
        await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: buildingName.trim(),
            property_id: property.id,
            address: address.trim() || null
          })
        })
      }

      onCreated()
    } catch (error) {
      console.error('Error creating property:', error)
      alert('Fehler beim Erstellen. Bitte versuchen Sie es erneut.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Neue Liegenschaft
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. Musterstrasse 1-5"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. 8000 Zuerich"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Optionale Beschreibung..."
              />
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Erstes Gebaeude (optional)
              </label>
              <input
                type="text"
                value={buildingName}
                onChange={e => setBuildingName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. Haus A"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sie koennen spaeter weitere Gebaeude hinzufuegen
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving}>
                Abbrechen
              </Button>
              <Button type="submit" fullWidth loading={saving}>
                Erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Property card component
 */
interface PropertyCardProps {
  property: PropertyWithBuildings
  onBuildingClick: (building: Building) => void
  onRefresh: () => void
}

function PropertyCard({ property, onBuildingClick, onRefresh }: PropertyCardProps) {
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [newBuildingName, setNewBuildingName] = useState('')
  const [addingBuilding, setAddingBuilding] = useState(false)

  const buildingCount = property.buildings.length

  async function handleAddBuilding(e: React.FormEvent) {
    e.preventDefault()
    if (!newBuildingName.trim()) return

    setAddingBuilding(true)
    try {
      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBuildingName.trim(),
          property_id: property.id
        })
      })

      if (!response.ok) throw new Error('Failed to create building')

      setNewBuildingName('')
      setShowAddBuilding(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating building:', error)
      alert('Fehler beim Erstellen des Gebaeudes')
    } finally {
      setAddingBuilding(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        {/* Property header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
              {property.name}
            </h3>
            {property.address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {property.address}
              </p>
            )}
          </div>
        </div>

        {/* Building count */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Building2 className="h-4 w-4" />
            <span>
              {buildingCount === 0
                ? 'Keine Gebaeude'
                : buildingCount === 1
                ? '1 Gebaeude'
                : `${buildingCount} Gebaeude`}
            </span>
          </div>
        </div>

        {/* Buildings list */}
        {property.buildings.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {property.buildings.map((building) => (
              <button
                key={building.id}
                onClick={() => onBuildingClick(building)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {building.name}
                </span>
                <span className="text-xs text-gray-400">Bearbeiten</span>
              </button>
            ))}
          </div>
        )}

        {/* Add Building Form */}
        {showAddBuilding ? (
          <form onSubmit={handleAddBuilding} className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="text"
              value={newBuildingName}
              onChange={e => setNewBuildingName(e.target.value)}
              className="w-full px-2 py-1.5 mb-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
              placeholder="Gebaeudenahme"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" fullWidth loading={addingBuilding}>
                Hinzufuegen
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddBuilding(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="mb-3"
            onClick={() => setShowAddBuilding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Gebaeude hinzufuegen
          </Button>
        )}

        {/* Description */}
        {property.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {property.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
