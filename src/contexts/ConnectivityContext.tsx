'use client'

/**
 * Connectivity Context
 *
 * Tracks online/offline status using navigator.onLine and window events.
 * Shows Sonner toasts on connectivity state changes.
 * Phase: 27-pwa-foundation
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface ConnectivityContextValue {
  isOnline: boolean
}

const ConnectivityContext = createContext<ConnectivityContextValue | undefined>(undefined)

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const isInitialMount = useRef(true)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (!isInitialMount.current) {
        toast.success('Wieder verbunden', { duration: 4000 })
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      if (!isInitialMount.current) {
        toast.warning('Verbindung verloren', { duration: 4000 })
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ConnectivityContext.Provider value={{ isOnline }}>
      {children}
    </ConnectivityContext.Provider>
  )
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext)
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider')
  }
  return context
}
