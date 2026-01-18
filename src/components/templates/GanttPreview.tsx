'use client'

import { useMemo, useState } from 'react'
import { addDays, format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import type { TemplateWithHierarchy, TemplateDependency } from '@/types/templates'

interface GanttPreviewProps {
  template: TemplateWithHierarchy
  startDate?: Date
  className?: string
}

interface GanttTask {
  id: string
  name: string
  wbs_code: string
  start: Date
  end: Date
  duration: number
  level: 'phase' | 'package' | 'task'
  parentId: string | null
  color: string
}

const levelColors = {
  phase: 'bg-blue-500',
  package: 'bg-purple-400',
  task: 'bg-green-400'
}

/**
 * GanttPreview Component
 *
 * CSS-based Gantt chart visualization for templates.
 * Shows task sequences, hierarchy, and dependencies.
 */
export function GanttPreview({
  template,
  startDate = new Date(),
  className = ''
}: GanttPreviewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(template.phases.map(p => p.id))
  )
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    new Set(template.phases.flatMap(p => p.packages?.map(pkg => pkg.id) || []))
  )

  const { ganttTasks, totalDays, endDate } = useMemo(() => {
    const tasks: GanttTask[] = []
    let currentDate = new Date(startDate)
    let maxEndDate = currentDate

    // Build dependency map
    const dependencyMap = new Map<string, TemplateDependency[]>()
    for (const dep of template.dependencies) {
      if (!dependencyMap.has(dep.successor_task_id)) {
        dependencyMap.set(dep.successor_task_id, [])
      }
      dependencyMap.get(dep.successor_task_id)!.push(dep)
    }

    // Task start dates (calculated with dependencies)
    const taskStartDates = new Map<string, Date>()

    // Process phases, packages, tasks
    for (const phase of template.phases) {
      const phaseStart = new Date(currentDate)
      let phaseEnd = phaseStart

      // Add phase
      tasks.push({
        id: phase.id,
        name: phase.name,
        wbs_code: phase.wbs_code,
        start: phaseStart,
        end: phaseStart, // Updated after processing children
        duration: phase.estimated_duration_days || 0,
        level: 'phase',
        parentId: null,
        color: levelColors.phase
      })

      for (const pkg of phase.packages || []) {
        const pkgStart = new Date(currentDate)
        let pkgEnd = pkgStart

        // Add package
        tasks.push({
          id: pkg.id,
          name: pkg.name,
          wbs_code: pkg.wbs_code,
          start: pkgStart,
          end: pkgStart, // Updated after processing children
          duration: pkg.estimated_duration_days || 0,
          level: 'package',
          parentId: phase.id,
          color: levelColors.package
        })

        for (const task of pkg.tasks || []) {
          // Calculate start based on dependencies
          let taskStart = new Date(currentDate)
          const deps = dependencyMap.get(task.id) || []

          for (const dep of deps) {
            const predecessorEnd = taskStartDates.get(dep.predecessor_task_id)
            if (predecessorEnd) {
              const depStart = addDays(predecessorEnd, dep.lag_days)
              if (depStart > taskStart) {
                taskStart = depStart
              }
            }
          }

          const taskEnd = addDays(taskStart, task.estimated_duration_days)
          taskStartDates.set(task.id, taskEnd)

          tasks.push({
            id: task.id,
            name: task.name,
            wbs_code: task.wbs_code,
            start: taskStart,
            end: taskEnd,
            duration: task.estimated_duration_days,
            level: 'task',
            parentId: pkg.id,
            color: levelColors.task
          })

          // Update package end
          if (taskEnd > pkgEnd) {
            pkgEnd = taskEnd
          }

          // Move forward for next task
          currentDate = taskEnd
        }

        // Update package dates
        const pkgIndex = tasks.findIndex(t => t.id === pkg.id)
        if (pkgIndex >= 0) {
          tasks[pkgIndex].end = pkgEnd
          tasks[pkgIndex].duration = differenceInDays(pkgEnd, pkgStart)
        }

        // Update phase end
        if (pkgEnd > phaseEnd) {
          phaseEnd = pkgEnd
        }
      }

      // Update phase dates
      const phaseIndex = tasks.findIndex(t => t.id === phase.id)
      if (phaseIndex >= 0) {
        tasks[phaseIndex].end = phaseEnd
        tasks[phaseIndex].duration = differenceInDays(phaseEnd, phaseStart)
      }

      if (phaseEnd > maxEndDate) {
        maxEndDate = phaseEnd
      }
    }

    return {
      ganttTasks: tasks,
      totalDays: Math.max(differenceInDays(maxEndDate, startDate), 1),
      endDate: maxEndDate
    }
  }, [template, startDate])

  const togglePhase = (id: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePackage = (id: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter visible tasks based on expansion state
  const visibleTasks = ganttTasks.filter(task => {
    if (task.level === 'phase') return true
    if (task.level === 'package') {
      return expandedPhases.has(task.parentId!)
    }
    if (task.level === 'task') {
      const pkg = ganttTasks.find(t => t.id === task.parentId)
      if (!pkg) return false
      return expandedPhases.has(pkg.parentId!) && expandedPackages.has(task.parentId!)
    }
    return true
  })

  // Calculate day width for time scale
  const dayWidth = Math.max(20, Math.min(50, 800 / totalDays))

  if (ganttTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border rounded-lg">
        Keine Tasks im Template vorhanden
      </div>
    )
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="font-medium">Timeline-Vorschau</h3>
        <div className="text-sm text-gray-500">
          Start: {format(startDate, 'dd.MM.yyyy', { locale: de })} |{' '}
          Dauer: {totalDays} Tage |{' '}
          Ende: {format(endDate, 'dd.MM.yyyy', { locale: de })}
        </div>
      </div>

      {/* Gantt chart */}
      <div className="flex overflow-x-auto">
        {/* Task list */}
        <div className="flex-shrink-0 w-64 border-r bg-white">
          <div className="h-8 bg-gray-100 border-b px-2 flex items-center text-sm font-medium text-gray-600">
            Aufgabe
          </div>
          {visibleTasks.map(task => (
            <div
              key={task.id}
              className={`h-8 border-b flex items-center text-sm ${
                task.level === 'phase' ? 'bg-blue-50 font-medium' :
                task.level === 'package' ? 'bg-gray-50 pl-4' : 'pl-8'
              }`}
            >
              {(task.level === 'phase' || task.level === 'package') && (
                <button
                  onClick={() => task.level === 'phase' ? togglePhase(task.id) : togglePackage(task.id)}
                  className="w-4 h-4 mr-1 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${
                      (task.level === 'phase' ? expandedPhases.has(task.id) : expandedPackages.has(task.id))
                        ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <span className="font-mono text-xs text-gray-400 mr-2">{task.wbs_code}</span>
              <span className="truncate">{task.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-grow overflow-x-auto">
          {/* Time scale header */}
          <div className="h-8 bg-gray-100 border-b flex">
            {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, weekIndex) => {
              const weekStart = addDays(startDate, weekIndex * 7)
              return (
                <div
                  key={weekIndex}
                  className="flex-shrink-0 border-r text-xs text-gray-500 px-1 flex items-center"
                  style={{ width: `${7 * dayWidth}px` }}
                >
                  KW {format(weekStart, 'w', { locale: de })}
                </div>
              )
            })}
          </div>

          {/* Task bars */}
          {visibleTasks.map(task => {
            const offsetDays = differenceInDays(task.start, startDate)
            const barDuration = Math.max(task.duration, 0.5)

            return (
              <div
                key={task.id}
                className="h-8 border-b relative"
                style={{ width: `${totalDays * dayWidth}px` }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
                    <div
                      key={i}
                      className="border-r border-gray-100"
                      style={{ width: `${7 * dayWidth}px` }}
                    />
                  ))}
                </div>

                {/* Bar */}
                <div
                  className={`absolute top-1 h-6 rounded ${task.color} shadow-sm flex items-center px-2 overflow-hidden`}
                  style={{
                    left: `${offsetDays * dayWidth}px`,
                    width: `${Math.max(barDuration * dayWidth, 20)}px`
                  }}
                  title={`${task.name}: ${task.duration} Tage`}
                >
                  {barDuration * dayWidth > 40 && (
                    <span className="text-xs text-white truncate">
                      {task.duration}d
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 bg-gray-50 border-t flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${levelColors.phase}`} />
          <span className="text-gray-600">Phase</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${levelColors.package}`} />
          <span className="text-gray-600">Paket</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${levelColors.task}`} />
          <span className="text-gray-600">Aufgabe</span>
        </div>
      </div>
    </div>
  )
}
