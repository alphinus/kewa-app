/**
 * UnitDetailPanel Component
 *
 * Right-anchored side panel for unit details with timeline, costs,
 * and drilldown navigation to projects and tasks.
 *
 * Phase 12-04: Drilldown Navigation & Side Panel
 * Requirements: DASH-04, DASH-05, DASH-06
 */

'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import UnitTimeline from '@/components/units/UnitTimeline'
import type { HeatmapUnit } from '@/lib/dashboard/heatmap-queries'

interface UnitDetailPanelProps {
  unit: HeatmapUnit | null
  onClose: () => void
}

export function UnitDetailPanel({ unit, onClose }: UnitDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Trap focus in panel
  useEffect(() => {
    if (unit && panelRef.current) {
      panelRef.current.focus()
    }
  }, [unit])

  if (!unit) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'w-full sm:w-96 md:w-[28rem]',
          'bg-white dark:bg-gray-900',
          'shadow-xl overflow-y-auto',
          'animate-slide-in-right'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {unit.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Schliessen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tenant info */}
          {unit.tenant_name && (
            <div className="px-4 pb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mieter: {unit.tenant_name}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Quick Links */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/aufgaben?unit_id=${unit.id}`}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              Aufgaben
            </Link>
            <Link
              href={`/dashboard/kosten/wohnungen/${unit.id}`}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
            >
              Kosten
            </Link>
            <Link
              href={`/dashboard/projekte?unit_id=${unit.id}`}
              className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50"
            >
              Projekte
            </Link>
          </div>

          {/* Condition Summary */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Renovierungsstatus
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {unit.renovation_percentage ?? 0}% renoviert
                </span>
                <span className="text-xs text-gray-500">
                  {unit.new_rooms}/{unit.total_rooms} Raeume
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${unit.renovation_percentage ?? 0}%` }}
                />
              </div>
            </div>
          </section>

          {/* Room Grid */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Raeume
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {unit.rooms.map((room) => (
                <div
                  key={room.id}
                  className={cn(
                    'p-2 rounded-lg border text-sm',
                    room.condition === 'new' && 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
                    room.condition === 'partial' && 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
                    room.condition === 'old' && 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  )}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {room.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Verlauf
            </h3>
            <UnitTimeline unitId={unit.id} />
          </section>
        </div>
      </div>
    </div>
  )
}
