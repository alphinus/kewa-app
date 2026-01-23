'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import type { Property, Building } from '@/types/database'

interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

interface PropertySelectorProps {
  onSelect: (buildingId: string) => void
}

/**
 * Property and Building selector for KEWA users
 * Shows hierarchical dropdown: Property → Building
 * Stores selection in localStorage
 */
export function PropertySelector({ onSelect }: PropertySelectorProps) {
  const [properties, setProperties] = useState<PropertyWithBuildings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  // Load stored selection on mount
  useEffect(() => {
    const stored = localStorage.getItem('kewa-selected-building')
    if (stored) {
      setSelectedBuildingId(stored)
      onSelect(stored)
    }
  }, [onSelect])

  // Fetch properties and buildings
  useEffect(() => {
    fetchProperties()
  }, [])

  async function fetchProperties() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Liegenschaften')
      }

      const data = await response.json()
      setProperties(data.properties || [])

      // If no selection yet, auto-select first building
      if (!selectedBuildingId && data.properties?.length > 0) {
        const firstProperty = data.properties[0]
        if (firstProperty.buildings?.length > 0) {
          const firstBuilding = firstProperty.buildings[0]
          handleBuildingSelect(firstBuilding.id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  function handleBuildingSelect(buildingId: string) {
    setSelectedBuildingId(buildingId)
    localStorage.setItem('kewa-selected-building', buildingId)
    onSelect(buildingId)
    setIsOpen(false)
  }

  // Find current selection details
  const selectedBuilding = properties
    .flatMap(p => p.buildings)
    .find(b => b.id === selectedBuildingId)

  const selectedProperty = properties.find(p =>
    p.buildings.some(b => b.id === selectedBuildingId)
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span>Laden...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400">
        <Building2 className="h-4 w-4" />
        <span>Fehler</span>
      </div>
    )
  }

  if (properties.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Liegenschaft auswählen"
      >
        <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <div className="flex flex-col items-start">
          {selectedProperty && selectedBuilding ? (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">
                {selectedProperty.name}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {selectedBuilding.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-900 dark:text-gray-100">
              Liegenschaft wählen
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown content */}
          <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
            {properties.map(property => (
              <div key={property.id} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                {/* Property header */}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {property.name}
                </div>

                {/* Buildings list */}
                {property.buildings.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                    Keine Gebäude
                  </div>
                ) : (
                  property.buildings.map(building => (
                    <button
                      key={building.id}
                      onClick={() => handleBuildingSelect(building.id)}
                      className={`w-full px-3 py-2 text-left rounded-md transition-colors ${
                        selectedBuildingId === building.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm font-medium">{building.name}</span>
                      </div>
                      {building.address && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                          {building.address}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
