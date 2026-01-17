'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import type { TaskPhotoWithUrl } from '@/types/database'

// =============================================
// TYPES
// =============================================

interface WeeklyReportTask {
  task: {
    id: string
    title: string
    completed_at: string | null
    completion_note: string | null
  }
  photos: {
    explanation: TaskPhotoWithUrl[]
    completion: TaskPhotoWithUrl[]
  }
}

interface WeeklyReportProject {
  project: {
    id: string
    name: string
  }
  tasks: WeeklyReportTask[]
}

interface WeeklyReportUnit {
  unit: {
    id: string
    name: string
    unit_type: string
    floor: number | null
  }
  projects: WeeklyReportProject[]
}

export interface WeeklyReportData {
  period: {
    start: string
    end: string
  }
  summary: {
    total_completed: number
    units_with_work: number
  }
  units: WeeklyReportUnit[]
}

interface WeeklyReportProps {
  data: WeeklyReportData
}

// =============================================
// HELPERS
// =============================================

/**
 * Format date in German locale
 * e.g. "15. Januar 2026, 14:30"
 */
function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get unit type label in German
 */
function getUnitTypeLabel(unitType: string): string {
  switch (unitType) {
    case 'apartment':
      return 'Wohnung'
    case 'common':
      return 'Allgemeinflaeche'
    case 'building':
      return 'Gebaeude'
    default:
      return unitType
  }
}

// =============================================
// COMPONENT
// =============================================

/**
 * Weekly report display component
 * Shows completed tasks grouped by unit and project
 * Mobile-first layout with collapsible sections
 */
export function WeeklyReport({ data }: WeeklyReportProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    // Start with all units expanded
    new Set(data.units.map(u => u.unit.id))
  )
  const [selectedPhoto, setSelectedPhoto] = useState<TaskPhotoWithUrl | null>(null)

  /**
   * Toggle unit expansion
   */
  const toggleUnit = useCallback((unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev)
      if (next.has(unitId)) {
        next.delete(unitId)
      } else {
        next.add(unitId)
      }
      return next
    })
  }, [])

  /**
   * Open photo in lightbox
   */
  const handlePhotoClick = useCallback((photo: TaskPhotoWithUrl) => {
    setSelectedPhoto(photo)
  }, [])

  /**
   * Close lightbox
   */
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null)
  }, [])

  /**
   * Handle lightbox backdrop click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeLightbox()
    }
  }, [closeLightbox])

  // Empty state
  if (data.units.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="py-8">
            <EmptyIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Keine erledigten Aufgaben in diesem Zeitraum
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Summary header */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.total_completed}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aufgaben erledigt
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.units_with_work}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Einheiten
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units list */}
      <div className="space-y-4">
        {data.units.map(unitData => {
          const isExpanded = expandedUnits.has(unitData.unit.id)
          const taskCount = unitData.projects.reduce(
            (sum, p) => sum + p.tasks.length,
            0
          )

          return (
            <Card key={unitData.unit.id}>
              {/* Unit header - clickable to expand/collapse */}
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleUnit(unitData.unit.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronIcon
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {unitData.unit.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getUnitTypeLabel(unitData.unit.unit_type)}
                        {unitData.unit.floor !== null && ` - Etage ${unitData.unit.floor}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {taskCount} {taskCount === 1 ? 'Aufgabe' : 'Aufgaben'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {/* Unit content - projects and tasks */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {unitData.projects.map(projectData => (
                      <div key={projectData.project.id}>
                        {/* Project header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {projectData.project.name}
                          </h4>
                        </div>

                        {/* Tasks */}
                        <div className="space-y-3 ml-4">
                          {projectData.tasks.map(taskData => (
                            <div
                              key={taskData.task.id}
                              className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                            >
                              {/* Task header */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {taskData.task.title}
                                  </span>
                                </div>
                              </div>

                              {/* Completion date */}
                              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mb-2">
                                {formatDateTime(taskData.task.completed_at)}
                              </p>

                              {/* Completion note */}
                              {taskData.task.completion_note && (
                                <div className="ml-6 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mb-3">
                                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {taskData.task.completion_note}
                                  </p>
                                </div>
                              )}

                              {/* Photos - Before/After comparison */}
                              {(taskData.photos.explanation.length > 0 ||
                                taskData.photos.completion.length > 0) && (
                                <div className="ml-6 mt-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Vorher column */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Vorher
                                        </span>
                                      </div>
                                      {taskData.photos.explanation.length > 0 ? (
                                        taskData.photos.explanation.map(photo => (
                                          <button
                                            key={photo.id}
                                            type="button"
                                            onClick={() => handlePhotoClick(photo)}
                                            className="block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98] transition-transform"
                                          >
                                            <img
                                              src={photo.url}
                                              alt={photo.file_name}
                                              className="w-full h-24 object-cover"
                                              loading="lazy"
                                            />
                                          </button>
                                        ))
                                      ) : (
                                        <div className="h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                          <span className="text-xs text-gray-400 dark:text-gray-500">
                                            -
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Nachher column */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Nachher
                                        </span>
                                      </div>
                                      {taskData.photos.completion.length > 0 ? (
                                        taskData.photos.completion.map(photo => (
                                          <button
                                            key={photo.id}
                                            type="button"
                                            onClick={() => handlePhotoClick(photo)}
                                            className="block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98] transition-transform"
                                          >
                                            <img
                                              src={photo.url}
                                              alt={photo.file_name}
                                              className="w-full h-24 object-cover"
                                              loading="lazy"
                                            />
                                          </button>
                                        ))
                                      ) : (
                                        <div className="h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                          <span className="text-xs text-gray-400 dark:text-gray-500">
                                            -
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Foto Vollansicht"
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.file_name}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Schliessen"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// =============================================
// ICONS
// =============================================

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  )
}
