'use client'

/**
 * Push Notification Context
 *
 * Manages service worker registration and push subscription state.
 * Phase: 24-push-notifications
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'

interface PushContextValue {
  subscription: PushSubscription | null
  isSupported: boolean
  isSubscribed: boolean
  subscribeToPush: () => Promise<void>
  unsubscribeFromPush: () => Promise<void>
}

const PushContext = createContext<PushContextValue | undefined>(undefined)

/**
 * Convert URL-safe base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Get or create device ID from cookie
 */
function getDeviceId(): string {
  let deviceId = Cookies.get('device_id')
  if (!deviceId) {
    deviceId = uuidv4()
    Cookies.set('device_id', deviceId, { expires: 365 }) // 1 year
  }
  return deviceId
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)

      // Register service worker and check existing subscription
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          return registration.pushManager.getSubscription()
        })
        .then((existingSubscription) => {
          if (existingSubscription) {
            setSubscription(existingSubscription)
            setIsSubscribed(true)
          }
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error)
        })
    }
  }, [])

  const subscribeToPush = async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported')
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured')
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })

      // Get device ID
      const deviceId = getDeviceId()

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: newSubscription.toJSON(),
          deviceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setSubscription(newSubscription)
      setIsSubscribed(true)
    } catch (error) {
      console.error('Push subscription failed:', error)
      throw error
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) {
      return
    }

    try {
      // Unsubscribe from browser
      await subscription.unsubscribe()

      // Get device ID
      const deviceId = getDeviceId()

      // Remove subscription from server
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription')
      }

      setSubscription(null)
      setIsSubscribed(false)
    } catch (error) {
      console.error('Push unsubscribe failed:', error)
      throw error
    }
  }

  return (
    <PushContext.Provider
      value={{
        subscription,
        isSupported,
        isSubscribed,
        subscribeToPush,
        unsubscribeFromPush,
      }}
    >
      {children}
    </PushContext.Provider>
  )
}

export function usePush() {
  const context = useContext(PushContext)
  if (context === undefined) {
    throw new Error('usePush must be used within a PushProvider')
  }
  return context
}
