'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Building2, Layers } from 'lucide-react'
import type { Property, Building } from '@/types/database'
import type { BuildingSelectionId } from '@/contexts/BuildingContext'

interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

interface PropertySelectorProps {
  selectedBuildingId: BuildingSelectionId
  onSelect: (buildingId: BuildingSelectionId) => void
}

/**
 * Property and Building selector for KEWA users
 * Shows hierarchical dropdown: "Alle Liegenschaften" → Property → Building
 * Session-only state - no localStorage persistence
 */
export function PropertySelector({ selectedBuildingId, onSelect }: PropertySelectorProps) {
  const [properties, setProperties] = useState<PropertyWithBuildings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const initialSelectionMade = useRef(false)

  // Fetch properties and buildings
  useEffect(() => {
    fetchProperties()
  }, [])

  // Validate selection when properties load or change
  useEffect(() => {
    if (loading || properties.length === 0) return

    // On initial load, auto-select first building if no selection
    if (!initialSelectionMade.current) {
      initialSelectionMade.current = true
      if (selectedBuildingId === null) {
        const firstProperty = properties[0]
        if (firstProperty.buildings?.length > 0) {
          onSelect(firstProperty.buildings[0].id)
        }
      }
      return
    }

    // Validate existing selection (handle deleted buildings)
    if (selectedBuildingId && selectedBuildingId !== 'all') {
      const buildingExists = properties.some(p =>
        p.buildings.some(b => b.id === selectedBuildingId)
      )
      if (!buildingExists) {
        // Fallback to first available building
        const firstProperty = properties[0]
        if (firstProperty?.buildings?.length > 0) {
          onSelect(firstProperty.buildings[0].id)
        }
      }
    }
  }, [properties, loading, selectedBuildingId, onSelect])

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  function handleBuildingSelect(buildingId: BuildingSelectionId) {
    onSelect(buildingId)
    setIsOpen(false)
  }

  // Find current selection details
  const isAllSelected = selectedBuildingId === 'all'

  const selectedBuilding = !isAllSelected
    ? properties.flatMap(p => p.buildings).find(b => b.id === selectedBuildingId)
    : null

  const selectedProperty = !isAllSelected
    ? properties.find(p => p.buildings.some(b => b.id === selectedBuildingId))
    : null

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
        aria-label="Liegenschaft auswaehlen"
      >
        {isAllSelected ? (
          <>
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Alle Liegenschaften
            </span>
          </>
        ) : selectedProperty && selectedBuilding ? (
          <>
            <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">
                {selectedProperty.name}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {selectedBuilding.name}
              </span>
            </div>
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              Liegenschaft waehlen
            </span>
          </>
        )}
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
            {/* "Alle Liegenschaften" option at top */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleBuildingSelect('all')}
                className={`w-full px-3 py-2.5 text-left rounded-md transition-colors ${
                  isAllSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold">Alle Liegenschaften</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">
                  Alle Gebaeude anzeigen
                </div>
              </button>
            </div>

            {/* Properties and buildings */}
            {properties.map(property => (
              <div key={property.id} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                {/* Property header */}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {property.name}
                </div>

                {/* Buildings list */}
                {property.buildings.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                    Keine Gebaeude
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
