'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { AudioGallery } from '@/components/audio/AudioGallery'
import type { TaskAudioWithUrl, AudioType, AudiosResponse } from '@/types/database'
type FilterType = 'all' | AudioType

/**
 * Audio overview page
 * Shows all audio recordings with filter tabs for all internal users
 */
export default function AudioPage() {
  const router = useRouter()

  // State
  const [audios, setAudios] = useState<TaskAudioWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [isInternal, setIsInternal] = useState<boolean | null>(null)

  /**
   * Check user access (internal users only)
   */
  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setIsInternal(data.isInternal ?? false)

        if (!data.isInternal) {
          router.push('/dashboard')
        }
      } else {
        router.push('/login')
      }
    } catch (err) {
      console.error('Error checking access:', err)
      router.push('/login')
    }
  }, [router])

  /**
   * Fetch all audio files
   */
  const fetchAudios = useCallback(async (audioType?: AudioType) => {
    try {
      setLoading(true)
      setError(null)

      const url = audioType
        ? `/api/audio?audio_type=${audioType}`
        : '/api/audio'

      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 400) {
          // Not authorized (Imeri trying to access)
          router.push('/dashboard')
          return
        }
        throw new Error('Fehler beim Laden der Sprachnotizen')
      }

      const data: AudiosResponse = await response.json()
      setAudios(data.audios)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Initial load
  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  // Fetch audios when access confirmed and filter changes
  useEffect(() => {
    if (isInternal) {
      if (filter === 'all') {
        fetchAudios()
      } else {
        fetchAudios(filter)
      }
    }
  }, [isInternal, filter, fetchAudios])

  // Filter tabs
  const filterTabs: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'explanation', label: 'Erklaerungen' },
    { value: 'emergency', label: 'Notfaelle' },
  ]

  // Filtered audios (client-side filter for smooth UX)
  const filteredAudios = filter === 'all'
    ? audios
    : audios.filter((a) => a.audio_type === filter)

  // Don't render until access is confirmed
  if (!isInternal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[48px]"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-1" />
          Zurueck
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Sprachnotizen
        </h1>
      </div>

      {/* Filter tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                  filter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                Wird geladen...
              </span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => fetchAudios(filter === 'all' ? undefined : filter)}
                className="text-blue-500 underline"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <AudioGallery audios={filteredAudios} showTaskInfo={true} />
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {!loading && !error && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          {filteredAudios.length} {filteredAudios.length === 1 ? 'Aufnahme' : 'Aufnahmen'}
          {filter !== 'all' && ` (${filter === 'explanation' ? 'Erklaerungen' : 'Notfaelle'})`}
        </div>
      )}
    </div>
  )
}

// Icon components
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
