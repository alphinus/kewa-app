'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export type BuildingSelectionId = string | 'all' | null

interface BuildingContextValue {
  selectedBuildingId: BuildingSelectionId
  selectBuilding: (buildingId: BuildingSelectionId) => void
  isAllSelected: boolean
  isLoading: boolean
}

const BuildingContext = createContext<BuildingContextValue | undefined>(undefined)

/**
 * Provides building selection state across the dashboard
 * Session-only state - resets on page refresh
 */
export function BuildingProvider({ children }: { children: ReactNode }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingSelectionId>(null)
  const [isLoading, setIsLoading] = useState(false)

  const selectBuilding = useCallback((buildingId: BuildingSelectionId) => {
    setSelectedBuildingId(buildingId)
    setIsLoading(false)
  }, [])

  const isAllSelected = selectedBuildingId === 'all'

  return (
    <BuildingContext.Provider
      value={{
        selectedBuildingId,
        selectBuilding,
        isAllSelected,
        isLoading
      }}
    >
      {children}
    </BuildingContext.Provider>
  )
}

/**
 * Hook to access building selection context
 * Must be used within BuildingProvider
 */
export function useBuilding() {
  const context = useContext(BuildingContext)
  if (context === undefined) {
    throw new Error('useBuilding must be used within a BuildingProvider')
  }
  return context
}
