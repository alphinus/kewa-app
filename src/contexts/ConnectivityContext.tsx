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
import { processSyncQueue, setLastSyncTime } from '@/lib/db/sync-queue'
import { processPhotoQueue } from '@/lib/sync/photo-uploader'

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
    const handleOnline = async () => {
      setIsOnline(true)
      if (!isInitialMount.current) {
        toast.success('Wieder verbunden', { duration: 4000 })

        // Trigger sync queue processing on reconnect
        try {
          const syncResult = await processSyncQueue()
          if (syncResult.synced > 0) {
            setLastSyncTime()
          }

          // Process photo queue after sync queue (form data is critical, photos secondary)
          const photoResult = await processPhotoQueue()
          if (photoResult.uploaded > 0) {
            toast.success(`${photoResult.uploaded} Foto(s) synchronisiert`)
          }
        } catch (error) {
          console.error('Sync queue processing failed:', error)
          // Don't throw - prevent sync errors from breaking connectivity context
        }
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
