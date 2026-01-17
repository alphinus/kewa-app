'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProjectWithUnit, ProjectsResponse, UnitWithStats, UnitsResponse } from '@/types/database'

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
 * Project selection dropdown with inline creation
 * Fetches projects from API and groups by unit name
 * Allows creating new projects inline
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
  const [units, setUnits] = useState<UnitWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Create project form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUnitId, setNewProjectUnitId] = useState(unitId || '')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Fetch projects
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

  // Fetch units for the create form
  useEffect(() => {
    async function fetchUnits() {
      try {
        const response = await fetch('/api/units')
        if (response.ok) {
          const data: UnitsResponse = await response.json()
          setUnits(data.units)
        }
      } catch {
        // Silently fail - units are needed only for creation
      }
    }

    fetchUnits()
  }, [])

  // Handle create project
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectUnitId) {
      setCreateError('Bitte Name und Einheit angeben')
      return
    }

    try {
      setCreating(true)
      setCreateError(null)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: newProjectUnitId,
          name: newProjectName.trim(),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Fehler beim Erstellen')
      }

      const data = await response.json()

      // Add to projects list with unit info
      const selectedUnit = units.find(u => u.id === newProjectUnitId)
      const newProject: ProjectWithUnit = {
        ...data.project,
        unit: {
          id: selectedUnit?.id || newProjectUnitId,
          name: selectedUnit?.name || '',
          unit_type: selectedUnit?.unit_type || 'apartment',
          floor: selectedUnit?.floor ?? null,
        },
      }

      setProjects(prev => [...prev, newProject])
      onChange(data.project.id)

      // Reset form
      setShowCreateForm(false)
      setNewProjectName('')
      setNewProjectUnitId(unitId || '')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

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
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Projekt
      </label>

      {/* Select dropdown */}
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__create__') {
            setShowCreateForm(true)
          } else {
            onChange(e.target.value)
          }
        }}
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

        {/* Create new option */}
        {!disabled && (
          <option value="__create__" className="font-medium text-blue-600">
            + Neues Projekt erstellen
          </option>
        )}

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

      {/* Inline create form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Neues Projekt erstellen
          </h4>

          {createError && (
            <p className="text-sm text-red-500">{createError}</p>
          )}

          {/* Unit select */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Einheit
            </label>
            <select
              value={newProjectUnitId}
              onChange={(e) => setNewProjectUnitId(e.target.value)}
              className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Einheit waehlen...</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project name */}
          <Input
            label="Projektname"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="z.B. Badezimmer, Kueche, Renovation..."
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowCreateForm(false)
                setNewProjectName('')
                setCreateError(null)
              }}
              disabled={creating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateProject}
              loading={creating}
            >
              Erstellen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
