'use client'

/**
 * DeadlineBanner Component
 *
 * Shows acceptance deadline prominently with color coding.
 * - Green: >48h remaining
 * - Yellow: 24-48h remaining
 * - Red: <24h remaining
 * - Expired: Past deadline
 *
 * Implements: EXT-16 (Deadline displayed with countdown)
 */

import { useMemo } from 'react'
import { getDeadlineStatus, type DeadlineStatus } from '@/lib/work-orders/deadline'

// ============================================
// TYPES
// ============================================

interface DeadlineBannerProps {
  deadline: string | null
  className?: string
}

// ============================================
// STYLING
// ============================================

const STATUS_STYLES: Record<DeadlineStatus, { bg: string; text: string; border: string; icon: string }> = {
  ok: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: 'text-green-500',
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
  },
  urgent: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-500',
  },
  expired: {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: 'text-gray-500',
  },
}

// ============================================
// COMPONENT
// ============================================

export default function DeadlineBanner({
  deadline,
  className = '',
}: DeadlineBannerProps) {
  // Calculate deadline status and display values
  const deadlineInfo = useMemo(() => {
    if (!deadline) return null

    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffMs = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    const status = getDeadlineStatus(deadline)

    // Format deadline date
    const formattedDate = deadlineDate.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // Format countdown
    let countdown: string
    if (diffMs <= 0) {
      countdown = 'Frist abgelaufen'
    } else if (diffDays >= 1) {
      countdown = `noch ${diffDays} Tag${diffDays === 1 ? '' : 'e'}`
    } else if (diffHours >= 1) {
      countdown = `noch ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`
    } else {
      const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
      countdown = `noch ${diffMinutes} Minute${diffMinutes === 1 ? '' : 'n'}`
    }

    return {
      status,
      formattedDate,
      countdown,
      isExpired: diffMs <= 0,
    }
  }, [deadline])

  // No deadline set
  if (!deadlineInfo) {
    return null
  }

  const styles = STATUS_STYLES[deadlineInfo.status]

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Clock icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {deadlineInfo.isExpired ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {deadlineInfo.isExpired ? (
            <>
              <p className={`font-medium ${styles.text}`}>
                Frist abgelaufen
              </p>
              <p className="text-sm mt-1 text-gray-600">
                Die Antwortfrist ist am {deadlineInfo.formattedDate} abgelaufen.
                Bitte kontaktieren Sie KEWA.
              </p>
            </>
          ) : (
            <>
              <p className={`font-medium ${styles.text}`}>
                Antwort bis: {deadlineInfo.formattedDate}
              </p>
              <p className={`text-sm mt-0.5 ${styles.text} opacity-80`}>
                ({deadlineInfo.countdown})
              </p>
            </>
          )}
        </div>

        {/* Status indicator */}
        {!deadlineInfo.isExpired && (
          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                deadlineInfo.status === 'ok'
                  ? 'bg-green-100 text-green-800'
                  : deadlineInfo.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {deadlineInfo.status === 'ok'
                ? 'Ausreichend Zeit'
                : deadlineInfo.status === 'warning'
                ? 'Bald faellig'
                : 'Dringend'}
            </span>
          </div>
        )}
      </div>

      {/* Contact info for expired */}
      {deadlineInfo.isExpired && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Um einen neuen Termin zu vereinbaren, wenden Sie sich bitte an KEWA AG.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPACT VARIANT
// ============================================

interface CompactDeadlineBannerProps {
  deadline: string | null
  className?: string
}

/**
 * Compact version for dashboard cards
 */
export function CompactDeadlineBanner({
  deadline,
  className = '',
}: CompactDeadlineBannerProps) {
  if (!deadline) return null

  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const status = getDeadlineStatus(deadline)

  const formattedDate = deadlineDate.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
  })

  // Determine text and color
  let displayText: string
  let textColor: string

  if (diffMs <= 0) {
    displayText = 'Abgelaufen'
    textColor = 'text-gray-600'
  } else if (diffDays >= 1) {
    displayText = `Bis ${formattedDate} (${diffDays}d)`
    textColor =
      status === 'ok'
        ? 'text-green-600'
        : status === 'warning'
        ? 'text-yellow-600'
        : 'text-red-600'
  } else {
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)))
    displayText = `Bis ${formattedDate} (${diffHours}h)`
    textColor = 'text-red-600'
  }

  return (
    <span className={`flex items-center gap-1 text-xs ${textColor} ${className}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {displayText}
    </span>
  )
}
