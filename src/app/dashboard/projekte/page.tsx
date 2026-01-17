'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectCard } from '@/components/projects/ProjectCard'
import type { ProjectWithUnit, ProjectsResponse, TasksResponse } from '@/types/database'

interface ProjectWithStats extends ProjectWithUnit {
  openTasksCount: number
  totalTasksCount: number
}

/**
 * Skeleton loading card
 */
function ProjectCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
          <div className="flex gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Projects management page for KEWA
 * Shows all projects with archive/unarchive functionality
 */
export default function ProjektePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  // Fetch projects with task counts
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch projects with archive filter
      const projectsUrl = showArchived
        ? '/api/projects?include_archived=true'
        : '/api/projects'

      const [projectsRes, tasksRes] = await Promise.all([
        fetch(projectsUrl),
        fetch('/api/tasks'),
      ])

      if (!projectsRes.ok) {
        throw new Error('Fehler beim Laden der Projekte')
      }
      if (!tasksRes.ok) {
        throw new Error('Fehler beim Laden der Aufgaben')
      }

      const projectsData: ProjectsResponse = await projectsRes.json()
      const tasksData: TasksResponse = await tasksRes.json()

      // Calculate task counts per project
      const taskCountsByProject = tasksData.tasks.reduce<
        Record<string, { open: number; total: number }>
      >((acc, task) => {
        const projectId = task.project.id
        if (!acc[projectId]) {
          acc[projectId] = { open: 0, total: 0 }
        }
        acc[projectId].total++
        if (task.status === 'open') {
          acc[projectId].open++
        }
        return acc
      }, {})

      // Merge projects with task counts
      const projectsWithStats: ProjectWithStats[] = projectsData.projects.map(
        (project) => ({
          ...project,
          openTasksCount: taskCountsByProject[project.id]?.open || 0,
          totalTasksCount: taskCountsByProject[project.id]?.total || 0,
        })
      )

      // Sort: active first, then archived
      projectsWithStats.sort((a, b) => {
        if (a.status === 'archived' && b.status !== 'archived') return 1
        if (a.status !== 'archived' && b.status === 'archived') return -1
        return a.name.localeCompare(b.name)
      })

      setProjects(projectsWithStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Handle archive/unarchive
  const handleArchive = async (projectId: string, archive: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Archivieren')
      }

      // Refresh projects list
      await fetchProjects()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Archivieren')
      throw err
    }
  }

  // Handle project click - navigate to tasks filtered by project
  const handleProjectClick = (project: ProjectWithUnit) => {
    router.push(`/dashboard/aufgaben?unit_id=${project.unit_id}`)
  }

  // Calculate counts
  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const archivedProjects = projects.filter((p) => p.status === 'archived')

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Projekte
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {loading ? (
              <span className="inline-block w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                {activeProjects.length} aktiv
                {showArchived && archivedProjects.length > 0 && (
                  <>, {archivedProjects.length} archiviert</>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Archive toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Archivierte anzeigen
          </span>
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Keine Projekte vorhanden
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Erstellen Sie ein Projekt in der Aufgabenverwaltung.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      {!loading && !error && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              openTasksCount={project.openTasksCount}
              totalTasksCount={project.totalTasksCount}
              onArchive={handleArchive}
              onClick={handleProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
