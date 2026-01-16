'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Session, SessionResponse, User, Role } from '@/types'

interface UseSessionReturn {
  session: Session
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Map role to display name
function getDisplayName(role: Role): string {
  switch (role) {
    case 'kewa':
      return 'KEWA AG'
    case 'imeri':
      return 'Imeri'
    default:
      return role
  }
}

/**
 * Client-side hook to fetch and manage session state
 * Fetches /api/auth/session on mount and provides refetch capability
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session>({ authenticated: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/session')

      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }

      const data: SessionResponse = await response.json()

      if (data.authenticated && data.role && data.userId) {
        const user: User = {
          id: data.userId,
          role: data.role,
          displayName: getDisplayName(data.role)
        }
        setSession({ authenticated: true, user })
      } else {
        setSession({ authenticated: false })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setSession({ authenticated: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return {
    session,
    loading,
    error,
    refetch: fetchSession
  }
}
