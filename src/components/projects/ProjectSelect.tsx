'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ProjectWithUnit, ProjectsResponse } from '@/types/database'

interface ProjectSelectProps {
  /** Currently selected project ID */
  value: string
  /** Callback when selection changes */
  onChange: (projectId: string) => void
  /** Optional unit ID to filter projects */
  unitId?: string
  /** Disable the select */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Optional className */
  className?: string
}

/**
 * Project selection dropdown
 * Fetches projects from API and groups by unit name
 */
export function ProjectSelect({
  value,
  onChange,
  unitId,
  disabled = false,
  error,
  className,
}: ProjectSelectProps) {
  const [projects, setProjects] = useState<ProjectWithUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setFetchError(null)

        const url = unitId
          ? `/api/projects?unit_id=${unitId}`
          : '/api/projects'

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Projekte')
        }

        const data: ProjectsResponse = await response.json()
        setProjects(data.projects)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [unitId])

  // Group projects by unit
  const projectsByUnit = projects.reduce<Record<string, ProjectWithUnit[]>>(
    (acc, project) => {
      const unitName = project.unit.name
      if (!acc[unitName]) {
        acc[unitName] = []
      }
      acc[unitName].push(project)
      return acc
    },
    {}
  )

  const unitNames = Object.keys(projectsByUnit).sort()

  const hasError = error || fetchError

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Projekt
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={cn(
          // Base styles - touch-friendly height
          'w-full h-12 min-h-[48px] px-4',
          'rounded-lg border',
          'bg-white dark:bg-gray-900',
          'text-gray-900 dark:text-gray-100',
          // Focus states
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'transition-colors duration-200',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
          // Border color based on error state
          hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500',
          className
        )}
      >
        <option value="">
          {loading ? 'Laden...' : 'Projekt waehlen...'}
        </option>

        {unitNames.length > 1 ? (
          // Group by unit if multiple units
          unitNames.map((unitName) => (
            <optgroup key={unitName} label={unitName}>
              {projectsByUnit[unitName].map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          // Flat list if single unit or no grouping needed
          projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.unit.name})
            </option>
          ))
        )}
      </select>

      {hasError && (
        <p className="mt-1 text-sm text-red-500" role="alert">
          {error || fetchError}
        </p>
      )}
    </div>
  )
}
