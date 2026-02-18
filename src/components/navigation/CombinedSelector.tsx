'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Building2, Layers } from 'lucide-react'
import { useMandate } from '@/contexts/MandateContext'
import { useBuilding } from '@/contexts/BuildingContext'
import type { Property, Building } from '@/types/database'

interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

interface MandateGroup {
  mandateId: string
  mandateName: string
  properties: PropertyWithBuildings[]
}

/**
 * Hierarchical mandate > property > building dropdown.
 *
 * Multi-mandate mode: shows mandate groups with properties + buildings.
 * Single-mandate mode (D3): skips mandate grouping, shows properties + buildings directly.
 *
 * Reads from MandateContext and BuildingContext — no prop drilling.
 * Building cookie is managed by BuildingProvider on selectBuilding call.
 */
export function CombinedSelector() {
  const {
    currentMandateId,
    availableMandates,
    switchMandate,
    isSingleMandate,
    isLoading: mandateIsLoading,
  } = useMandate()

  const { selectedBuildingId, selectBuilding } = useBuilding()

  const [properties, setProperties] = useState<PropertyWithBuildings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const initialSelectionMade = useRef(false)

  // Fetch all properties (RLS-scoped to org by middleware)
  useEffect(() => {
    fetchProperties()
  }, [])

  // On initial load: auto-select first building if no selection persisted from cookie
  useEffect(() => {
    if (loading || mandateIsLoading || properties.length === 0) return
    if (initialSelectionMade.current) return

    initialSelectionMade.current = true

    if (selectedBuildingId === null) {
      const firstProperty = properties[0]
      if (firstProperty?.buildings?.length > 0) {
        selectBuilding(firstProperty.buildings[0].id)
      }
    }
  }, [properties, loading, mandateIsLoading, selectedBuildingId, selectBuilding])

  // Validate: if selectedBuilding no longer exists in property list (stale after mandate switch), reset
  useEffect(() => {
    if (loading || properties.length === 0 || !initialSelectionMade.current) return
    if (!selectedBuildingId || selectedBuildingId === 'all') return

    const buildingExists = properties.some(p =>
      p.buildings.some(b => b.id === selectedBuildingId)
    )
    if (!buildingExists) {
      selectBuilding('all')
    }
  }, [properties, selectedBuildingId, selectBuilding, loading])

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

  function handleBuildingSelect(buildingMandateId: string | null, buildingId: string) {
    // If building belongs to a different mandate, switch mandate first
    if (buildingMandateId && buildingMandateId !== currentMandateId) {
      switchMandate(buildingMandateId)
    }
    selectBuilding(buildingId)
    setIsOpen(false)
  }

  function handleSelectAll() {
    switchMandate('all')
    selectBuilding('all')
    setIsOpen(false)
  }

  function handleSelectAllSingleMandate() {
    selectBuilding('all')
    setIsOpen(false)
  }

  // Build mandate groups for multi-mandate mode
  const mandateGroups: MandateGroup[] = availableMandates.map(mandate => ({
    mandateId: mandate.id,
    mandateName: mandate.name,
    properties: properties.filter(p => p.mandate_id === mandate.id),
  }))

  // Find current selection details for trigger button
  const isAllSelected = selectedBuildingId === 'all' || selectedBuildingId === null
  const selectedBuilding = !isAllSelected
    ? properties.flatMap(p => p.buildings).find(b => b.id === selectedBuildingId)
    : null
  const selectedProperty = !isAllSelected
    ? properties.find(p => p.buildings.some(b => b.id === selectedBuildingId))
    : null

  // Derive trigger label
  function getTriggerLabel(): string {
    if (isAllSelected) {
      return isSingleMandate ? 'Alle Liegenschaften' : 'Alle Mandate'
    }
    if (selectedBuilding && selectedProperty) {
      return `${selectedProperty.name} / ${selectedBuilding.name}`
    }
    return 'Gebäude wählen'
  }

  if (loading || mandateIsLoading) {
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
      {/* Selector trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Liegenschaft und Gebäude auswählen"
      >
        {isAllSelected ? (
          <>
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {getTriggerLabel()}
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
              Gebäude wählen
            </span>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
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
          <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">

            {isSingleMandate ? (
              /* ── Single-mandate mode (D3): flat property > building list ── */
              <>
                {/* "Alle Liegenschaften" option */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSelectAllSingleMandate}
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
                  </button>
                </div>

                {/* Properties with buildings */}
                {properties.map(property => (
                  <div key={property.id} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {property.name}
                    </div>
                    {property.buildings.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                        Keine Gebäude
                      </div>
                    ) : (
                      property.buildings.map(building => (
                        <button
                          key={building.id}
                          onClick={() => handleBuildingSelect(property.mandate_id, building.id)}
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
              </>
            ) : (
              /* ── Multi-mandate mode: mandate > property > building hierarchy ── */
              <>
                {/* "Alle Mandate" option */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSelectAll}
                    className={`w-full px-3 py-2.5 text-left rounded-md transition-colors ${
                      isAllSelected && currentMandateId === 'all'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold">Alle Mandate</span>
                    </div>
                  </button>
                </div>

                {/* Mandate groups */}
                {mandateGroups.map(group => (
                  <div key={group.mandateId} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    {/* Mandate group header */}
                    <div className="px-2 py-1 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {group.mandateName}
                    </div>

                    {group.properties.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                        Keine Liegenschaften
                      </div>
                    ) : (
                      group.properties.map(property => (
                        <div key={property.id}>
                          {/* Property sub-header */}
                          <div className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {property.name}
                          </div>

                          {/* Buildings */}
                          {property.buildings.length === 0 ? (
                            <div className="px-4 py-1.5 text-sm text-gray-400 dark:text-gray-500 italic">
                              Keine Gebäude
                            </div>
                          ) : (
                            property.buildings.map(building => (
                              <button
                                key={building.id}
                                onClick={() => handleBuildingSelect(group.mandateId, building.id)}
                                className={`w-full px-4 py-2 text-left rounded-md transition-colors ${
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
                                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5">
                                    {building.address}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
