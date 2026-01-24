'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PropertySelector } from './PropertySelector'
import type { User } from '@/types'
import type { BuildingSelectionId } from '@/contexts/BuildingContext'

interface HeaderProps {
  user?: User
  selectedBuildingId: BuildingSelectionId
  onBuildingSelect?: (buildingId: BuildingSelectionId) => void
}

/**
 * App header with logo, property selector (for KEWA), and logout button
 * Sticky top, h-16 for touch-friendly interaction
 */
export function Header({ user, selectedBuildingId, onBuildingSelect }: HeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  function handleBuildingSelect(buildingId: BuildingSelectionId) {
    if (onBuildingSelect) {
      onBuildingSelect(buildingId)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 safe-area-top">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Logo / App title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            KEWA
          </span>
        </div>

        {/* Property selector (only for KEWA role) */}
        {user?.role === 'kewa' && (
          <div className="flex-shrink-0">
            <PropertySelector
              selectedBuildingId={selectedBuildingId}
              onSelect={handleBuildingSelect}
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User role and logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {user && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
              {user.displayName}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            loading={loggingOut}
            aria-label="Abmelden"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
