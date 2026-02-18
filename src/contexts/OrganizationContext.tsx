'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import Cookies from 'js-cookie'
import type { Organization } from '@/types'

export const COOKIE_OPTIONS = { path: '/', sameSite: 'strict' as const, expires: 365 }
export const ORG_COOKIE = 'organization_id'
export const MANDATE_COOKIE = 'mandate_id'
export const BUILDING_COOKIE = 'building_id'

interface OrganizationContextValue {
  currentOrg: Organization | null
  availableOrgs: Organization[]
  switchOrg: (orgId: string) => void
  isLoading: boolean
  isMultiOrg: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

/**
 * Provides organization selection state across the dashboard.
 * Reads organization_id cookie on mount, fetches available orgs from GET /api/organizations,
 * validates cookie against fetched list, and exposes switchOrg for org switching.
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const cookieOrgId = Cookies.get(ORG_COOKIE)

        const response = await fetch('/api/organizations')
        if (!response.ok) {
          throw new Error(`Failed to fetch organizations: ${response.status}`)
        }
        const data = await response.json() as { organizations: Organization[] }
        const orgs = data.organizations ?? []
        setAvailableOrgs(orgs)

        // Stale validation: prefer cookie org if it exists in fetched list
        let selectedOrg: Organization | null = null
        if (cookieOrgId) {
          selectedOrg = orgs.find(o => o.id === cookieOrgId) ?? null
        }
        // Fallback to isDefault org, then first org
        if (!selectedOrg) {
          selectedOrg = orgs.find(o => o.isDefault) ?? orgs[0] ?? null
        }

        setCurrentOrg(selectedOrg)

        // Write cookie if it changed or wasn't set
        if (selectedOrg && selectedOrg.id !== cookieOrgId) {
          Cookies.set(ORG_COOKIE, selectedOrg.id, COOKIE_OPTIONS)
        }
      } catch (error) {
        console.error('[OrganizationProvider] Failed to fetch organizations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  const switchOrg = useCallback((orgId: string) => {
    // Per D5: set org cookie, clear mandate and building cookies, then full page reload
    Cookies.set(ORG_COOKIE, orgId, COOKIE_OPTIONS)
    Cookies.remove(MANDATE_COOKIE, { path: '/' })
    Cookies.remove(BUILDING_COOKIE, { path: '/' })
    window.location.href = '/dashboard'
  }, [])

  const contextValue = useMemo<OrganizationContextValue>(() => ({
    currentOrg,
    availableOrgs,
    switchOrg,
    isLoading,
    isMultiOrg: availableOrgs.length > 1,
  }), [currentOrg, availableOrgs, switchOrg, isLoading])

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}

/**
 * Hook to access organization context.
 * Must be used within OrganizationProvider.
 */
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
