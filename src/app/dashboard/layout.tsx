'use client'

import { useSession } from '@/hooks/useSession'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { Header } from '@/components/navigation/header'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { MandateProvider } from '@/contexts/MandateContext'
import { BuildingProvider } from '@/contexts/BuildingContext'
import { ConnectivityProvider } from '@/contexts/ConnectivityContext'
import type { User } from '@/types'

/**
 * Inner layout component — lives inside all context providers.
 */
function DashboardLayoutInner({
  children,
  user
}: {
  children: React.ReactNode
  user: User | undefined
}) {
  // Trigger install prompt after login
  useInstallPrompt()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header with user info, org switcher, combined selector, and logout */}
      <Header user={user} />

      {/* Main content area with padding for header and nav */}
      <main className="pb-20 pt-4 px-4">
        {children}
      </main>

      {/* Bottom navigation - all internal users see full nav */}
      <MobileNav isInternal={user?.isInternal} />
    </div>
  )
}

/**
 * Dashboard layout with role-based navigation.
 * Wraps all dashboard pages with Organization > Mandate > Building > Connectivity providers,
 * then Header and MobileNav.
 * Uses useSession hook to get current user and role.
 */
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { session, loading } = useSession()

  // Show loading skeleton while session is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="sticky top-0 z-50 w-full h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-pulse" />
        <main className="pb-20 pt-4 px-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </main>
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-pulse" />
      </div>
    )
  }

  return (
    <OrganizationProvider>
      <MandateProvider>
        <BuildingProvider>
          <ConnectivityProvider>
            <DashboardLayoutInner user={session.user}>
              {children}
            </DashboardLayoutInner>
          </ConnectivityProvider>
        </BuildingProvider>
      </MandateProvider>
    </OrganizationProvider>
  )
}
