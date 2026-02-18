'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import Cookies from 'js-cookie'
import { useMandate } from './MandateContext'
import { BUILDING_COOKIE, COOKIE_OPTIONS } from './OrganizationContext'

export type BuildingSelectionId = string | 'all' | null

interface BuildingContextValue {
  selectedBuildingId: BuildingSelectionId
  selectBuilding: (buildingId: BuildingSelectionId) => void
  isAllSelected: boolean
  isLoading: boolean
}

const BuildingContext = createContext<BuildingContextValue | undefined>(undefined)

/**
 * Provides building selection state across the dashboard.
 * Persists selection to/from building_id cookie.
 * Scoped to current mandate via useMandate() — CombinedSelector handles building filtering.
 */
export function BuildingProvider({ children }: { children: ReactNode }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingSelectionId>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Consume mandate context for scoping — CombinedSelector (Plan 03) uses this for filtering
  useMandate()

  // Restore previous selection from cookie on mount
  useEffect(() => {
    const cookieBuildingId = Cookies.get(BUILDING_COOKIE)
    if (cookieBuildingId) {
      setSelectedBuildingId(cookieBuildingId)
    }
  }, [])

  const selectBuilding = useCallback((buildingId: BuildingSelectionId) => {
    setSelectedBuildingId(buildingId)
    setIsLoading(false)
    // Persist selection to cookie
    if (buildingId === null) {
      Cookies.remove(BUILDING_COOKIE, { path: '/' })
    } else {
      Cookies.set(BUILDING_COOKIE, buildingId, COOKIE_OPTIONS)
    }
  }, [])

  const isAllSelected = selectedBuildingId === 'all'

  const contextValue = useMemo<BuildingContextValue>(() => ({
    selectedBuildingId,
    selectBuilding,
    isAllSelected,
    isLoading,
  }), [selectedBuildingId, selectBuilding, isAllSelected, isLoading])

  return (
    <BuildingContext.Provider value={contextValue}>
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
