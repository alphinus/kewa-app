'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useOrganization } from '@/contexts/OrganizationContext'

/**
 * Organization badge + dropdown for multi-org users.
 * Renders null for single-org users (isMultiOrg = false).
 * Switching org triggers full page navigation (D5) via switchOrg.
 */
export function OrgSwitcher() {
  const { currentOrg, availableOrgs, switchOrg, isMultiOrg, isLoading } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)

  // Single-org users see nothing — per D2
  if (isLoading || !isMultiOrg) {
    return null
  }

  function handleOrgSelect(orgId: string) {
    if (orgId !== currentOrg?.id) {
      switchOrg(orgId)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Org badge trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
        aria-label="Organisation wechseln"
      >
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {currentOrg?.name ?? '—'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown content */}
          <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="p-1">
              {availableOrgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => handleOrgSelect(org.id)}
                  className={`w-full px-3 py-2.5 text-left rounded-md transition-colors flex items-center justify-between gap-2 ${
                    org.id === currentOrg?.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span className="text-sm font-medium">{org.name}</span>
                  {org.id === currentOrg?.id && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
