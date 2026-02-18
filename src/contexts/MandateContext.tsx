'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import Cookies from 'js-cookie'
import type { Mandate } from '@/types'
import { useOrganization, MANDATE_COOKIE, BUILDING_COOKIE, COOKIE_OPTIONS } from './OrganizationContext'

interface MandateContextValue {
  currentMandateId: string | 'all'
  availableMandates: Mandate[]
  switchMandate: (mandateId: string | 'all') => void
  isLoading: boolean
  isSingleMandate: boolean
}

const MandateContext = createContext<MandateContextValue | undefined>(undefined)

/**
 * Provides mandate selection state across the dashboard.
 * Waits for OrganizationProvider to finish loading before fetching mandates.
 * Reads mandate_id cookie on mount, validates against fetched list, and exposes switchMandate.
 */
export function MandateProvider({ children }: { children: ReactNode }) {
  const { currentOrg, isLoading: orgIsLoading } = useOrganization()
  const [currentMandateId, setCurrentMandateId] = useState<string | 'all'>('all')
  const [availableMandates, setAvailableMandates] = useState<Mandate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Race condition prevention (Pitfall 2): only fetch when currentOrg is non-null
    if (orgIsLoading || !currentOrg) {
      return
    }

    async function fetchMandates() {
      try {
        const cookieMandateId = Cookies.get(MANDATE_COOKIE)

        const response = await fetch('/api/mandates')
        if (!response.ok) {
          throw new Error(`Failed to fetch mandates: ${response.status}`)
        }
        const data = await response.json() as { mandates: Mandate[] }
        const mandates = data.mandates ?? []
        setAvailableMandates(mandates)

        // Stale validation: prefer cookie mandate if it exists in fetched list
        let selectedMandateId: string | 'all' = 'all'
        if (cookieMandateId === 'all') {
          selectedMandateId = 'all'
        } else if (cookieMandateId) {
          const found = mandates.find(m => m.id === cookieMandateId)
          selectedMandateId = found ? found.id : 'all'
        }

        setCurrentMandateId(selectedMandateId)

        // Write cookie if it changed or wasn't set
        if (selectedMandateId !== cookieMandateId) {
          Cookies.set(MANDATE_COOKIE, selectedMandateId, COOKIE_OPTIONS)
        }
      } catch (error) {
        console.error('[MandateProvider] Failed to fetch mandates:', error)
        setCurrentMandateId('all')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMandates()
  }, [currentOrg, orgIsLoading])

  const switchMandate = useCallback((mandateId: string | 'all') => {
    // Per D6: set mandate cookie, remove building cookie (building may not exist in new mandate)
    Cookies.set(MANDATE_COOKIE, mandateId, COOKIE_OPTIONS)
    Cookies.remove(BUILDING_COOKIE, { path: '/' })
    setCurrentMandateId(mandateId)
  }, [])

  const contextValue = useMemo<MandateContextValue>(() => ({
    currentMandateId,
    availableMandates,
    switchMandate,
    // Cascade loading state: if org is loading, mandate is also loading
    isLoading: orgIsLoading || isLoading,
    isSingleMandate: availableMandates.length === 1,
  }), [currentMandateId, availableMandates, switchMandate, orgIsLoading, isLoading])

  return (
    <MandateContext.Provider value={contextValue}>
      {children}
    </MandateContext.Provider>
  )
}

/**
 * Hook to access mandate context.
 * Must be used within MandateProvider.
 */
export function useMandate() {
  const context = useContext(MandateContext)
  if (context === undefined) {
    throw new Error('useMandate must be used within a MandateProvider')
  }
  return context
}
