'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import { useBuilding } from '@/contexts/BuildingContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardShortcuts } from '@/components/knowledge/DashboardShortcuts'
import type { TaskWithProject, TasksResponse } from '@/types/database'
import type { Priority } from '@/types'

/**
 * Format relative time in German
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min.`
  if (diffHours < 24) return `vor ${diffHours} Std.`
  if (diffDays === 1) return 'gestern'
  return `vor ${diffDays} Tagen`
}

/**
 * Priority badge configuration
 */
function getPriorityBadge(priority: Priority): { label: string; className: string } {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Dringend',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      }
    case 'high':
      return {
        label: 'Hoch',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      }
    case 'normal':
      return {
        label: 'Normal',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      }
    case 'low':
      return {
        label: 'Niedrig',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      }
  }
}

/**
 * Skeleton for number display
 */
function NumberSkeleton() {
  return <span className="inline-block w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
}

/**
 * Skeleton for activity item
 */
function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      </div>
    </div>
  )
}

/**
 * Task preview card for Imeri dashboard
 */
function TaskPreviewCard({ task }: { task: TaskWithProject }) {
  const priorityBadge = getPriorityBadge(task.priority)
  const location = `${task.unit.name} - ${task.project.name}`

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {task.title}
            </p>
            <p className="text-sm text-gray-500 truncate">{location}</p>
          </div>
          <span
            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${priorityBadge.className}`}
          >
            {priorityBadge.label}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard home page
 * Shows different content based on user role:
 * - KEWA AG: Overview with real stats and activity
 * - Imeri: Task preview with link to full list
 */
export default function DashboardPage() {
  const { session, loading: sessionLoading } = useSession()
  const { selectedBuildingId, isAllSelected, isLoading: buildingLoading } = useBuilding()
  const role = session.user?.role

  // Task data
  const [openTasks, setOpenTasks] = useState<TaskWithProject[]>([])
  const [completedTasks, setCompletedTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch tasks with building filter
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)

      // Build query params with building_id filter
      const buildingParam = selectedBuildingId && selectedBuildingId !== 'all'
        ? `&building_id=${selectedBuildingId}`
        : ''

      // Fetch open and completed tasks in parallel
      const [openRes, completedRes] = await Promise.all([
        fetch(`/api/tasks?status=open${buildingParam}`),
        fetch(`/api/tasks?status=completed${buildingParam}`),
      ])

      if (openRes.ok) {
        const data: TasksResponse = await openRes.json()
        setOpenTasks(data.tasks)
      }

      if (completedRes.ok) {
        const data: TasksResponse = await completedRes.json()
        setCompletedTasks(data.tasks)
      }
    } catch {
      // Silently fail - will show 0 counts
    } finally {
      setLoading(false)
    }
  }, [selectedBuildingId])

  // Re-fetch when building selection changes
  useEffect(() => {
    if (!sessionLoading && session.authenticated && !buildingLoading) {
      fetchTasks()
    }
  }, [sessionLoading, session.authenticated, buildingLoading, selectedBuildingId, fetchTasks])

  // Calculate today's completed tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const completedToday = completedTasks.filter((task) => {
    if (!task.completed_at) return false
    const completedDate = new Date(task.completed_at)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })

  // Get recent activity (last 5 completed tasks)
  const recentActivity = [...completedTasks]
    .sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    })
    .slice(0, 5)

  // KEWA AG dashboard - overview with real data
  if (role === 'kewa') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Willkommen bei KEWA
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Uebersicht aller Projekte und Aufgaben
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Offene Aufgaben
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? <NumberSkeleton /> : openTasks.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Heute erledigt
              </p>
              <p className="text-3xl font-bold text-[var(--status-success)]">
                {loading ? <NumberSkeleton /> : completedToday.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity card */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Letzte Aktivitaeten
            </h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ul className="space-y-3">
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
              </ul>
            ) : recentActivity.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                Noch keine erledigten Aufgaben
              </p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.unit.name} - {task.completed_at && formatRelativeTime(task.completed_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pinned KB articles shortcuts */}
        <Card>
          <CardContent className="p-4">
            <DashboardShortcuts />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Imeri dashboard - task preview
  const previewTasks = openTasks.slice(0, 3)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Meine Aufgaben
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        {loading ? (
          <span className="inline-block w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ) : (
          `Heute zu erledigen: ${openTasks.length} Aufgaben`
        )}
      </p>

      {/* Task preview list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full ml-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : previewTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Keine offenen Aufgaben
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gut gemacht! Alle Aufgaben sind erledigt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {previewTasks.map((task) => (
              <TaskPreviewCard key={task.id} task={task} />
            ))}
          </div>

          {/* View all link */}
          {openTasks.length > 3 && (
            <Link href="/dashboard/tasks">
              <Button variant="secondary" fullWidth>
                Alle {openTasks.length} Aufgaben anzeigen
              </Button>
            </Link>
          )}

          {openTasks.length <= 3 && openTasks.length > 0 && (
            <Link href="/dashboard/tasks">
              <Button variant="secondary" fullWidth>
                Zur Aufgabenliste
              </Button>
            </Link>
          )}
        </>
      )}
    </div>
  )
}
