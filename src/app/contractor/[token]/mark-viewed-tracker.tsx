'use client'

/**
 * Mark Viewed Tracker Component
 *
 * Client component that auto-marks 'sent' work orders as 'viewed'
 * when the contractor opens the dashboard for the first time.
 *
 * Implements EXT-13: Tracking - Viewed status set when magic link opened
 *
 * This is a hidden component that fires an API call on mount
 * to update the viewed_at timestamp for all sent work orders.
 */

import { useEffect } from 'react'

interface MarkViewedTrackerProps {
  token: string
  workOrderIds: string[]
}

export function MarkViewedTracker({ token, workOrderIds }: MarkViewedTrackerProps) {
  useEffect(() => {
    // Only run once on mount
    if (workOrderIds.length === 0) return

    const markAsViewed = async () => {
      try {
        const response = await fetch(`/api/contractor/${token}/mark-viewed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workOrderIds }),
        })

        if (!response.ok) {
          console.error('Failed to mark work orders as viewed')
        }
      } catch (error) {
        console.error('Error marking work orders as viewed:', error)
      }
    }

    markAsViewed()
  }, [token, workOrderIds])

  // This component doesn't render anything
  return null
}
