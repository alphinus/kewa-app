'use client'

/**
 * EventLog Component
 *
 * Timeline display of work order events for admin UI.
 * Shows all activities with timestamps, actors, and expandable details.
 *
 * Implements: EXT-14 (Event log viewable in admin UI)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  EVENT_TYPE_LABELS,
  ACTOR_TYPE_LABELS,
  type WorkOrderEvent,
  type WorkOrderEventType,
  type WorkOrderActorType,
} from '@/lib/work-orders/events'

// ============================================
// TYPES
// ============================================

interface EventLogProps {
  workOrderId: string
  className?: string
}

interface EventIconConfig {
  icon: string
  bgColor: string
  textColor: string
}

// ============================================
// EVENT ICONS & COLORS
// ============================================

const EVENT_ICONS: Record<WorkOrderEventType, EventIconConfig> = {
  created: {
    icon: 'M12 4v16m8-8H4',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
  },
  sent: {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-600',
  },
  viewed: {
    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
  },
  accepted: {
    icon: 'M5 13l4 4L19 7',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  rejected: {
    icon: 'M6 18L18 6M6 6l12 12',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
  },
  counter_offer_submitted: {
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
  },
  counter_offer_approved: {
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  counter_offer_rejected: {
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
  },
  started: {
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
  completed: {
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-600',
  },
  upload_added: {
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-600',
  },
  upload_removed: {
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
  status_changed: {
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
}

// ============================================
// COMPONENT
// ============================================

export default function EventLog({ workOrderId, className = '' }: EventLogProps) {
  const [events, setEvents] = useState<WorkOrderEvent[]>([])
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
          `/api/work-orders/${workOrderId}/events?limit=${LIMIT}&offset=${currentOffset}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }

        const data = await response.json()

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
    [workOrderId, offset]
  )

  // Initial load
  useEffect(() => {
    fetchEvents()
  }, [workOrderId]) // eslint-disable-line react-hooks/exhaustive-deps

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
      minute: '2-digit',
    })
  }

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return null
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Render event data details
  const renderEventData = (event: WorkOrderEvent) => {
    const data = event.event_data
    if (!data || Object.keys(data).length === 0) return null

    const details: { label: string; value: string }[] = []

    // Status change
    if (data.old_status && data.new_status) {
      details.push({
        label: 'Status',
        value: `${data.old_status} -> ${data.new_status}`,
      })
    }

    // Counter-offer data
    if (data.proposed_cost !== undefined) {
      const cost = formatCurrency(data.proposed_cost)
      if (cost) details.push({ label: 'Vorgeschlagene Kosten', value: cost })
    }
    if (data.proposed_start_date) {
      details.push({ label: 'Vorgeschlagener Start', value: data.proposed_start_date })
    }
    if (data.proposed_end_date) {
      details.push({ label: 'Vorgeschlagenes Ende', value: data.proposed_end_date })
    }
    if (data.notes) {
      details.push({ label: 'Notizen', value: data.notes })
    }

    // Rejection
    if (data.rejection_reason) {
      details.push({ label: 'Ablehnungsgrund', value: data.rejection_reason })
    }

    // Upload data
    if (data.file_name) {
      details.push({ label: 'Dateiname', value: data.file_name })
    }
    if (data.context) {
      details.push({ label: 'Kontext', value: data.context })
    }

    // Creation data
    if (data.title) {
      details.push({ label: 'Titel', value: data.title })
    }

    if (details.length === 0) return null

    return (
      <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
        {details.map((detail, idx) => (
          <div key={idx} className="text-sm">
            <span className="text-gray-500">{detail.label}:</span>{' '}
            <span className="text-gray-700">{detail.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Get actor display
  const getActorDisplay = (event: WorkOrderEvent) => {
    const actorLabel = ACTOR_TYPE_LABELS[event.actor_type as WorkOrderActorType] || event.actor_type
    if (event.actor_email) {
      return `${actorLabel} (${event.actor_email})`
    }
    return actorLabel
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
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
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => fetchEvents()}
          className="mt-2 text-sm text-blue-600 hover:underline"
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
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-gray-500 text-sm">Keine Ereignisse vorhanden</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flow-root">
        <ul className="-mb-8">
          {events.map((event, eventIdx) => {
            const iconConfig = EVENT_ICONS[event.event_type as WorkOrderEventType] || EVENT_ICONS.status_changed
            const isExpanded = expandedEvents.has(event.id)
            const hasDetails =
              event.event_data && Object.keys(event.event_data).length > 0

            return (
              <li key={event.id}>
                <div className="relative pb-8">
                  {/* Timeline line */}
                  {eventIdx !== events.length - 1 && (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
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
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={iconConfig.icon} />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {EVENT_TYPE_LABELS[event.event_type as WorkOrderEventType] ||
                            event.event_type}
                        </p>
                        <time className="text-xs text-gray-500" dateTime={event.created_at}>
                          {formatTimestamp(event.created_at)}
                        </time>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {getActorDisplay(event)}
                      </p>

                      {/* Expandable details */}
                      {hasDetails && (
                        <>
                          <button
                            onClick={() => toggleExpanded(event.id)}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
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

                          {isExpanded && renderEventData(event)}
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
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isLoadingMore ? 'Wird geladen...' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  )
}
