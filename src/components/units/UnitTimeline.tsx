'use client'

/**
 * UnitTimeline Component
 *
 * Timeline display of all unit activities (projects, work orders,
 * condition changes, costs) with expandable details.
 *
 * Phase 11-01: Unit Timeline View
 * Requirement: HIST-01
 *
 * Pattern follows: src/components/admin/work-orders/EventLog.tsx
 */

import { useState, useEffect, useCallback } from 'react'
import type { TimelineEvent, TimelineEventType, TimelineResponse } from '@/types/timeline'

// =============================================
// TYPES
// =============================================

interface UnitTimelineProps {
  unitId: string
  className?: string
}

interface EventIconConfig {
  icon: string
  bgColor: string
  textColor: string
}

// =============================================
// EVENT ICONS & COLORS
// =============================================

const EVENT_TYPE_ICONS: Record<TimelineEventType, EventIconConfig> = {
  project: {
    // ClipboardDocumentList icon path
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  work_order: {
    // WrenchScrewdriver icon path
    icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  condition: {
    // SparklesIcon path
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400'
  },
  cost: {
    // CurrencyDollarIcon (using CHF-style)
    icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400'
  },
  media: {
    // PhotoIcon path
    icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-600 dark:text-cyan-400'
  }
}

// Status-based color overrides
const STATUS_COLORS: Record<string, { bgColor: string; textColor: string }> = {
  completed: {
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400'
  },
  approved: {
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  rejected: {
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400'
  },
  cancelled: {
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400'
  },
  done: {
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-600 dark:text-teal-400'
  },
  new: {
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400'
  },
  paid: {
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400'
  }
}

// German labels for event subtypes
const EVENT_SUBTYPE_LABELS: Record<string, string> = {
  created: 'Erstellt',
  draft: 'Entwurf',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  on_hold: 'Pausiert',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
  approved: 'Freigegeben',
  sent: 'Gesendet',
  viewed: 'Angesehen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  done: 'Erledigt',
  paid: 'Bezahlt',
  new: 'Neu',
  partial: 'Teilweise',
  old: 'Alt'
}

// Condition labels (German)
const CONDITION_LABELS: Record<string, string> = {
  new: 'Neu',
  partial: 'Teilweise renoviert',
  old: 'Alt'
}

// =============================================
// COMPONENT
// =============================================

export default function UnitTimeline({ unitId, className = '' }: UnitTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const LIMIT = 20

  // Fetch events
  const fetchEvents = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setIsLoadingMore(true)
        } else {
          setIsLoading(true)
          setOffset(0)
        }

        const currentOffset = loadMore ? offset : 0
        const response = await fetch(
          `/api/units/${unitId}/timeline?limit=${LIMIT}&offset=${currentOffset}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch timeline')
        }

        const data: TimelineResponse = await response.json()

        if (loadMore) {
          setEvents((prev) => [...prev, ...data.events])
        } else {
          setEvents(data.events)
        }

        setHasMore(data.pagination.hasMore)
        setOffset(currentOffset + data.events.length)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [unitId, offset]
  )

  // Initial load
  useEffect(() => {
    fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  // Toggle event details
  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return null
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount)
  }

  // Render event metadata details
  const renderEventDetails = (event: TimelineEvent) => {
    const metadata = event.metadata
    if (!metadata) return null

    const details: { label: string; value: string }[] = []

    // Status
    if (metadata.status && event.event_subtype !== metadata.status) {
      details.push({
        label: 'Status',
        value: EVENT_SUBTYPE_LABELS[metadata.status] || metadata.status
      })
    }

    // Amount for cost events
    if (metadata.amount !== undefined) {
      const formatted = formatCurrency(metadata.amount)
      if (formatted) details.push({ label: 'Betrag', value: formatted })
    }

    // Condition change
    if (metadata.old_condition && metadata.condition) {
      details.push({
        label: 'Aenderung',
        value: `${CONDITION_LABELS[metadata.old_condition] || metadata.old_condition} -> ${CONDITION_LABELS[metadata.condition] || metadata.condition}`
      })
    } else if (metadata.condition) {
      details.push({
        label: 'Neuer Zustand',
        value: CONDITION_LABELS[metadata.condition] || metadata.condition
      })
    }

    // Room name
    if (metadata.room_name) {
      details.push({ label: 'Raum', value: metadata.room_name })
    }

    // Project name
    if (metadata.project_name) {
      details.push({ label: 'Projekt', value: metadata.project_name })
    }

    // Partner name
    if (metadata.partner_name) {
      details.push({ label: 'Handwerker', value: metadata.partner_name })
    }

    // Description
    if (event.description) {
      details.push({ label: 'Notiz', value: event.description })
    }

    if (details.length === 0) return null

    return (
      <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
        {details.map((detail, idx) => (
          <div key={idx} className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">{detail.label}:</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{detail.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Get icon config for event (with status override)
  const getIconConfig = (event: TimelineEvent): EventIconConfig => {
    const baseConfig = EVENT_TYPE_ICONS[event.event_type]

    // Check for status-based override
    const status = event.metadata?.status || event.event_subtype
    const statusOverride = STATUS_COLORS[status]

    if (statusOverride) {
      return {
        ...baseConfig,
        bgColor: statusOverride.bgColor,
        textColor: statusOverride.textColor
      }
    }

    return baseConfig
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={() => fetchEvents()}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
          Keine Aktivitaeten fuer diese Wohnung
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flow-root">
        <ul className="-mb-8">
          {events.map((event, eventIdx) => {
            const iconConfig = getIconConfig(event)
            const isExpanded = expandedEvents.has(event.id)
            const hasDetails =
              (event.metadata && Object.keys(event.metadata).length > 0) ||
              event.description

            return (
              <li key={event.id}>
                <div className="relative pb-8">
                  {/* Timeline line */}
                  {eventIdx !== events.length - 1 && (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex items-start space-x-3">
                    {/* Icon */}
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full ${iconConfig.bgColor}`}
                    >
                      <svg
                        className={`h-4 w-4 ${iconConfig.textColor}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={iconConfig.icon} />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.title}
                        </p>
                        <time
                          className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2"
                          dateTime={event.timestamp}
                        >
                          {formatTimestamp(event.timestamp)}
                        </time>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {EVENT_SUBTYPE_LABELS[event.event_subtype] || event.event_subtype}
                      </p>

                      {/* Expandable details */}
                      {hasDetails && (
                        <>
                          <button
                            onClick={() => toggleExpanded(event.id)}
                            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <svg
                              className={`h-3 w-3 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            {isExpanded ? 'Details ausblenden' : 'Details anzeigen'}
                          </button>

                          {isExpanded && renderEventDetails(event)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => fetchEvents(true)}
            disabled={isLoadingMore}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {isLoadingMore ? 'Wird geladen...' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  )
}
