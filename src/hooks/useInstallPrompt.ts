'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSAL_KEY = 'kewa_install_dismissed'

function getSessionId(): string {
  // Round to the day for session tracking
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const installedHandler = () => {
      setCanInstall(false)
      deferredPromptRef.current = null
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const promptInstall = async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return

    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      setCanInstall(false)
      deferredPromptRef.current = null
    }
  }

  const showInstallToast = () => {
    toast('KEWA als App installieren', {
      description: 'Für schnelleren Zugriff auf dem Startbildschirm hinzufügen',
      duration: 4000,
      action: {
        label: 'Installieren',
        onClick: () => {
          void promptInstall()
        },
      },
      onDismiss: () => {
        // Track dismissal by session
        localStorage.setItem(DISMISSAL_KEY, getSessionId())
      },
    })
  }

  const shouldShowToast = (): boolean => {
    if (!canInstall) return false

    const dismissedSession = localStorage.getItem(DISMISSAL_KEY)
    const currentSession = getSessionId()

    // Show if never dismissed or dismissed in a previous session
    return dismissedSession !== currentSession
  }

  // Auto-show toast after 2 seconds if should show
  useEffect(() => {
    if (shouldShowToast()) {
      const timer = setTimeout(() => {
        showInstallToast()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [canInstall])

  return {
    canInstall,
    promptInstall,
    showInstallToast,
  }
}
