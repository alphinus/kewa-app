'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProjectWithUnit } from '@/types/database'

interface ProjectCardProps {
  project: ProjectWithUnit
  openTasksCount: number
  totalTasksCount: number
  onArchive: (projectId: string, archive: boolean) => Promise<void>
  onClick?: (project: ProjectWithUnit) => void
  buildingName?: string
}

/**
 * Project card with archive functionality
 * Shows project info, task count, and archive/restore button
 */
export function ProjectCard({
  project,
  openTasksCount,
  totalTasksCount,
  onArchive,
  onClick,
  buildingName,
}: ProjectCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const isArchived = project.status === 'archived'
  const canArchive = openTasksCount === 0 && totalTasksCount > 0
  const completedTasksCount = totalTasksCount - openTasksCount

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isArchived) {
      // Unarchive directly without confirmation
      handleArchiveConfirm()
    } else {
      setShowConfirmDialog(true)
    }
  }

  const handleArchiveConfirm = async () => {
    try {
      setArchiving(true)
      await onArchive(project.id, !isArchived)
    } finally {
      setArchiving(false)
      setShowConfirmDialog(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-200 cursor-pointer',
          isArchived && 'opacity-60 bg-gray-50 dark:bg-gray-900/50',
          !isArchived && 'hover:shadow-md'
        )}
        onClick={() => onClick?.(project)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Project info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    'font-semibold truncate',
                    isArchived
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  {project.name}
                </h3>
                {isArchived && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    Archiviert
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {buildingName && (
                  <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                    {buildingName}
                  </span>
                )}
                {project.unit.name}
              </p>

              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Task count */}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn(
                    'text-sm',
                    openTasksCount > 0
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  )}
                >
                  {openTasksCount > 0 ? (
                    <>{openTasksCount} offen</>
                  ) : totalTasksCount > 0 ? (
                    <>Alle erledigt</>
                  ) : (
                    <>Keine Aufgaben</>
                  )}
                </span>
                {totalTasksCount > 0 && (
                  <span className="text-sm text-gray-400">
                    ({completedTasksCount}/{totalTasksCount})
                  </span>
                )}
              </div>
            </div>

            {/* Archive button */}
            <div className="flex-shrink-0">
              {isArchived ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleArchiveClick}
                  disabled={archiving}
                  title="Wiederherstellen"
                  className="min-h-[40px] min-w-[40px] px-3"
                >
                  {archiving ? (
                    <span className="animate-spin">&#9696;</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                      />
                    </svg>
                  )}
                </Button>
              ) : canArchive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleArchiveClick}
                  disabled={archiving}
                  title="Archivieren"
                  className="min-h-[40px] min-w-[40px] px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {archiving ? (
                    <span className="animate-spin">&#9696;</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                      />
                    </svg>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Projekt archivieren?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Möchten Sie &quot;{project.name}&quot; archivieren?
                Archivierte Projekte werden standardmaessig ausgeblendet.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={archiving}
                  fullWidth
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleArchiveConfirm}
                  loading={archiving}
                  fullWidth
                >
                  Archivieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
