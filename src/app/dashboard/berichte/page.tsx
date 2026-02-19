'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Button } from '@/components/ui/button'
import { WeeklyReport, type WeeklyReportData } from '@/components/reports/WeeklyReport'

// =============================================
// HELPERS
// =============================================

/**
 * Get Monday of the week containing the given date
 */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get Sunday of the week containing the given date
 */
function getSunday(date: Date): Date {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format date range in German
 * e.g. "10. Jan - 16. Jan 2026"
 */
function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'short',
  })
  const endStr = end.toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${startStr} - ${endStr}`
}

// =============================================
// COMPONENT
// =============================================

/**
 * Weekly reports page for KEWA AG
 * Shows completed tasks with week navigation
 */
export default function BerichtePage() {
  const router = useRouter()

  // State
  const [isInternal, setIsInternal] = useState<boolean | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [weekEnd, setWeekEnd] = useState<Date>(() => getSunday(new Date()))
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch current user access
   */
  const fetchUserRole = useCallback(async () => {
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
      console.error('Error fetching user role:', err)
      router.push('/login')
    } finally {
      setRoleLoading(false)
    }
  }, [router])

  /**
   * Fetch weekly report data
   */
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const startDate = formatDateISO(weekStart)
      const endDate = formatDateISO(weekEnd)

      const response = await fetch(
        `/api/reports/weekly?start_date=${startDate}&end_date=${endDate}`
      )

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard')
          return
        }
        throw new Error('Fehler beim Laden des Berichts')
      }

      const data: WeeklyReportData = await response.json()
      setReportData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd, router])

  // Fetch role on mount
  useEffect(() => {
    fetchUserRole()
  }, [fetchUserRole])

  // Fetch report when week changes (only if internal)
  useEffect(() => {
    if (isInternal) {
      fetchReportData()
    }
  }, [isInternal, fetchReportData])

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = useCallback(() => {
    setWeekStart(prev => {
      const newStart = new Date(prev)
      newStart.setDate(prev.getDate() - 7)
      return newStart
    })
    setWeekEnd(prev => {
      const newEnd = new Date(prev)
      newEnd.setDate(prev.getDate() - 7)
      return newEnd
    })
  }, [])

  /**
   * Navigate to next week
   */
  const goToNextWeek = useCallback(() => {
    setWeekStart(prev => {
      const newStart = new Date(prev)
      newStart.setDate(prev.getDate() + 7)
      return newStart
    })
    setWeekEnd(prev => {
      const newEnd = new Date(prev)
      newEnd.setDate(prev.getDate() + 7)
      return newEnd
    })
  }, [])

  // Check if next week is in the future
  const isNextWeekFuture = weekEnd > new Date()

  // Role loading state
  if (roleLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Not internal - should have been redirected but show nothing
  if (!isInternal) {
    return null
  }

  return (
    <div className="space-y-4 pb-20">
      <DashboardBreadcrumbs />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Wochenbericht
        </h1>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
        <Button
          variant="secondary"
          size="md"
          onClick={goToPreviousWeek}
          className="min-w-[100px]"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-1" />
          Vorherige
        </Button>

        <div className="text-center px-2">
          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
            {formatDateRange(weekStart, weekEnd)}
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={goToNextWeek}
          disabled={isNextWeekFuture}
          className="min-w-[100px]"
        >
          Nächste
          <ChevronRightIcon className="w-5 h-5 ml-1" />
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-6 text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchReportData}>
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Report content */}
      {!loading && !error && reportData && (
        <WeeklyReport data={reportData} />
      )}
    </div>
  )
}

// =============================================
// ICONS
// =============================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
