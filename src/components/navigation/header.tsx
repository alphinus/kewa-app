'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'

interface HeaderProps {
  user?: User
}

/**
 * App header with logo, user role indicator, and logout button
 * Sticky top, h-16 for touch-friendly interaction
 */
export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

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
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo / App title */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            KEWA
          </span>
        </div>

        {/* User role and logout */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
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
