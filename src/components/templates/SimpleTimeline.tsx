'use client'

import { useMemo } from 'react'
import type { TemplateWithHierarchy } from '@/types/templates'

interface SimpleTimelineProps {
  template: TemplateWithHierarchy
  className?: string
}

const phaseColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500'
]

/**
 * SimpleTimeline Component
 *
 * Lightweight CSS-only timeline visualization for templates.
 * Used as fallback when GanttPreview is not suitable.
 */
export function SimpleTimeline({ template, className = '' }: SimpleTimelineProps) {
  const { phases, totalDays } = useMemo(() => {
    let offset = 0
    const phaseData = template.phases.map((phase, index) => {
      // Calculate phase duration from packages/tasks
      let duration = phase.estimated_duration_days || 0

      if (duration === 0) {
        // Sum up package durations
        duration = (phase.packages || []).reduce((sum, pkg) => {
          let pkgDuration = pkg.estimated_duration_days || 0
          if (pkgDuration === 0) {
            // Sum up task durations
            pkgDuration = (pkg.tasks || []).reduce((tSum, t) => tSum + t.estimated_duration_days, 0)
          }
          return sum + pkgDuration
        }, 0)
      }

      duration = Math.max(duration, 1) // Minimum 1 day

      const data = {
        ...phase,
        offset,
        calculatedDuration: duration,
        color: phaseColors[index % phaseColors.length],
        packageCount: phase.packages?.length || 0,
        taskCount: (phase.packages || []).reduce(
          (sum, pkg) => sum + (pkg.tasks?.length || 0), 0
        )
      }
      offset += duration
      return data
    })

    return {
      phases: phaseData,
      totalDays: offset || 1
    }
  }, [template])

  if (phases.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border rounded-lg">
        Keine Phasen im Template vorhanden
      </div>
    )
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="font-medium">Timeline-Vorschau</h3>
        <div className="text-sm text-gray-500">
          Gesamt: {totalDays} Tage | {phases.length} Phasen
        </div>
      </div>

      <div className="p-4">
        {/* Timeline bars */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '200px' }}>
          {/* Week markers */}
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
              <div
                key={i}
                className="border-r border-gray-200 flex-shrink-0"
                style={{ width: `${(7 / totalDays) * 100}%` }}
              >
                <div className="text-xs text-gray-400 px-1 py-0.5">
                  W{i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Phase bars */}
          <div className="relative p-4 space-y-3">
            {phases.map((phase) => {
              const left = (phase.offset / totalDays) * 100
              const width = (phase.calculatedDuration / totalDays) * 100

              return (
                <div key={phase.id} className="relative">
                  {/* Phase bar */}
                  <div
                    className={`relative h-10 ${phase.color} rounded-lg shadow-sm flex items-center px-3 overflow-hidden transition-all hover:shadow-md`}
                    style={{
                      marginLeft: `${left}%`,
                      width: `${Math.max(width, 8)}%`,
                      minWidth: '80px'
                    }}
                    title={`${phase.name}: ${phase.calculatedDuration} Tage`}
                  >
                    <span className="text-white text-sm font-medium truncate flex-1">
                      {phase.wbs_code} {phase.name}
                    </span>
                    <span className="text-white/80 text-xs ml-2 whitespace-nowrap">
                      {phase.calculatedDuration}d
                    </span>
                  </div>

                  {/* Package/task count */}
                  <div
                    className="text-xs text-gray-500 mt-0.5"
                    style={{
                      marginLeft: `${left}%`
                    }}
                  >
                    {phase.packageCount} Pakete, {phase.taskCount} Aufgaben
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {phases.map((phase) => (
            <div key={phase.id} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded ${phase.color}`} />
              <span className="text-gray-600">{phase.name}</span>
              <span className="text-gray-400">({phase.calculatedDuration}d)</span>
            </div>
          ))}
        </div>

        {/* Summary table */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Phase</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Pakete</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Aufgaben</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Dauer</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {phases.map((phase) => (
                <tr key={phase.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded ${phase.color}`} />
                      <span className="font-mono text-gray-400 text-xs">{phase.wbs_code}</span>
                      <span>{phase.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{phase.packageCount}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{phase.taskCount}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{phase.calculatedDuration} Tage</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-3 py-2">Gesamt</td>
                <td className="px-3 py-2 text-right">
                  {phases.reduce((s, p) => s + p.packageCount, 0)}
                </td>
                <td className="px-3 py-2 text-right">
                  {phases.reduce((s, p) => s + p.taskCount, 0)}
                </td>
                <td className="px-3 py-2 text-right">{totalDays} Tage</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
