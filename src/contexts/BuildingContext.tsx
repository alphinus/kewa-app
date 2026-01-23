'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

interface BuildingContextValue {
  selectedBuildingId: string | null
  selectBuilding: (buildingId: string) => void
  isLoading: boolean
}

const BuildingContext = createContext<BuildingContextValue | undefined>(undefined)

const STORAGE_KEY = 'kewa-selected-building'

/**
 * Provides building selection state across the dashboard
 * Persists selection in localStorage
 */
export function BuildingProvider({ children }: { children: ReactNode }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load stored selection on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSelectedBuildingId(stored)
    }
    setIsLoading(false)
  }, [])

  const selectBuilding = useCallback((buildingId: string) => {
    setSelectedBuildingId(buildingId)
    localStorage.setItem(STORAGE_KEY, buildingId)
  }, [])

  return (
    <BuildingContext.Provider
      value={{
        selectedBuildingId,
        selectBuilding,
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
