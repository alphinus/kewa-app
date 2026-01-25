'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SetupWizard } from '@/components/wizard/SetupWizard'

interface AdminDashboardClientProps {
  propertyCount: number
  children: React.ReactNode
}

const SETUP_COMPLETE_KEY = 'kewa_setup_complete'

/**
 * Client wrapper for admin dashboard
 * Shows setup wizard for first-time users with no data
 */
export function AdminDashboardClient({ propertyCount, children }: AdminDashboardClientProps) {
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [checkComplete, setCheckComplete] = useState(false)

  useEffect(() => {
    // Check if setup has been completed
    const setupComplete = localStorage.getItem(SETUP_COMPLETE_KEY)

    // Show wizard if:
    // 1. Setup not marked complete in localStorage
    // 2. AND no properties exist (truly empty system)
    if (setupComplete !== 'true' && propertyCount === 0) {
      setShowWizard(true)
    }

    setCheckComplete(true)
  }, [propertyCount])

  function handleWizardComplete() {
    localStorage.setItem(SETUP_COMPLETE_KEY, 'true')
    setShowWizard(false)
    router.refresh()
  }

  function handleWizardSkip() {
    localStorage.setItem(SETUP_COMPLETE_KEY, 'true')
    setShowWizard(false)
  }

  // Don't render until we've checked localStorage
  if (!checkComplete) {
    return null
  }

  return (
    <>
      {showWizard && (
        <SetupWizard
          onComplete={handleWizardComplete}
          onSkip={propertyCount > 0 ? handleWizardSkip : undefined}
        />
      )}
      {children}
    </>
  )
}
