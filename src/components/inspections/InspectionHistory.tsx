'use client'

/**
 * Inspection History Component
 *
 * Timeline view showing inspection chain (parent-child relationships).
 * Displays inspection history from root to current with status badges.
 *
 * Phase: 23-inspection-advanced
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import type { Inspection } from '@/types/inspections'

interface InspectionHistoryProps {
  inspectionId: string
  currentInspectionId: string
}

export function InspectionHistory({
  inspectionId,
  currentInspectionId,
}: InspectionHistoryProps) {
  const [history, setHistory] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/inspections/${inspectionId}/history`)
        if (res.ok) {
          const data = await res.json()
          setHistory(data)
        }
      } catch (error) {
        console.error('Error fetching inspection history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [inspectionId])

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Lade Verlauf...
      </div>
    )
  }

  // Don't show if only one inspection (no history)
  if (history.length <= 1) return null

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Inspektionsverlauf
      </h4>
      <div className="space-y-2">
        {history.map((item, index) => {
          const isCurrent = item.id === currentInspectionId
          const isFirst = index === 0

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : ''
              }`}
            >
              {/* Timeline indicator */}
              <div className="relative">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {index + 1}
                </div>
                {/* Vertical line connecting items */}
                {index < history.length - 1 && (
                  <div className="absolute top-6 left-1/2 w-0.5 h-4 bg-gray-300 dark:bg-gray-600 -translate-x-1/2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isCurrent ? (
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                    {item.title}
                    {isFirst && ' (Original)'}
                  </span>
                ) : (
                  <Link
                    href={`/dashboard/abnahmen/${item.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                  >
                    {item.title}
                    {isFirst && ' (Original)'}
                  </Link>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.inspection_date).toLocaleDateString('de-CH')}
                </span>
              </div>

              {/* Status badge */}
              <InspectionStatusBadge status={item.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
