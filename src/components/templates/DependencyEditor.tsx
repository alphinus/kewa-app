'use client'

import { useState, useMemo } from 'react'
import type {
  TemplateWithHierarchy,
  TemplateDependency,
  TemplateTask
} from '@/types/templates'
import type { DependencyType } from '@/types'
import {
  getDependentTasks,
  getPrerequisiteTasks,
  detectCircularDependency
} from '@/lib/templates/dependencies'

interface DependencyEditorProps {
  template: TemplateWithHierarchy
  onAddDependency: (
    predecessorId: string,
    successorId: string,
    type: DependencyType,
    lagDays: number
  ) => Promise<void>
  onDeleteDependency: (dependencyId: string) => Promise<void>
}

const dependencyTypeLabels: Record<DependencyType, { label: string; description: string }> = {
  FS: { label: 'FS (Finish-to-Start)', description: 'Nachfolger startet wenn Vorgaenger endet' },
  SS: { label: 'SS (Start-to-Start)', description: 'Beide starten gleichzeitig' },
  FF: { label: 'FF (Finish-to-Finish)', description: 'Beide enden gleichzeitig' },
  SF: { label: 'SF (Start-to-Finish)', description: 'Nachfolger endet wenn Vorgaenger startet' }
}

/**
 * DependencyEditor Component
 *
 * Interface for managing task dependencies in a template.
 * Features:
 * - List current dependencies with type and lag
 * - Add new dependency with predecessor/successor selection
 * - Dependency type selector (FS, SS, FF, SF)
 * - Lag days input
 * - Delete dependency
 * - Circular dependency warning
 * - Show affected tasks on hover
 */
export function DependencyEditor({
  template,
  onAddDependency,
  onDeleteDependency
}: DependencyEditorProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for new dependency
  const [predecessorId, setPredecessorId] = useState<string>('')
  const [successorId, setSuccessorId] = useState<string>('')
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS')
  const [lagDays, setLagDays] = useState<number>(0)

  // Hovered dependency for showing affected tasks
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null)

  // Get all tasks as flat list
  const allTasks = useMemo(() => {
    const tasks: TemplateTask[] = []
    for (const phase of template.phases) {
      for (const pkg of phase.packages) {
        for (const task of pkg.tasks) {
          tasks.push(task)
        }
      }
    }
    return tasks
  }, [template])

  // Get task by ID
  const getTask = (id: string): TemplateTask | undefined => {
    return allTasks.find(t => t.id === id)
  }

  // Check if adding this dependency would create a cycle
  const wouldCreateCycle = useMemo(() => {
    if (!predecessorId || !successorId) return false
    if (predecessorId === successorId) return true

    const proposed = [
      ...template.dependencies.map(d => ({
        predecessor_task_id: d.predecessor_task_id,
        successor_task_id: d.successor_task_id
      })),
      { predecessor_task_id: predecessorId, successor_task_id: successorId }
    ]

    return detectCircularDependency(proposed).hasCircle
  }, [predecessorId, successorId, template.dependencies])

  // Get affected tasks for a dependency
  const getAffectedForDep = (dep: TemplateDependency) => {
    const deps = template.dependencies.map(d => ({
      predecessor_task_id: d.predecessor_task_id,
      successor_task_id: d.successor_task_id
    }))
    const dependents = getDependentTasks(deps, dep.successor_task_id)
    const prerequisites = getPrerequisiteTasks(deps, dep.predecessor_task_id)
    return { dependents, prerequisites }
  }

  // Reset form
  const resetForm = () => {
    setPredecessorId('')
    setSuccessorId('')
    setDependencyType('FS')
    setLagDays(0)
    setError(null)
    setIsAddingNew(false)
  }

  // Handle add
  const handleAdd = async () => {
    if (!predecessorId || !successorId) {
      setError('Bitte wählen Sie Vorgaenger und Nachfolger')
      return
    }

    if (predecessorId === successorId) {
      setError('Eine Aufgabe kann nicht von sich selbst abhaengen')
      return
    }

    if (wouldCreateCycle) {
      setError('Diese Abhängigkeit wuerde einen Zyklus erzeugen')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onAddDependency(predecessorId, successorId, dependencyType, lagDays)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen')
    } finally {
      setLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (depId: string) => {
    if (!confirm('Abhängigkeit löschen?')) return

    setLoading(true)
    try {
      await onDeleteDependency(depId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add button / form */}
      {!isAddingNew ? (
        <button
          onClick={() => setIsAddingNew(true)}
          disabled={loading || allTasks.length < 2}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
        >
          + Abhängigkeit hinzufügen
        </button>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
          <h4 className="font-medium text-gray-900">Neue Abhängigkeit</h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Predecessor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vorgaenger (muss zuerst erledigt werden)
              </label>
              <select
                value={predecessorId}
                onChange={e => setPredecessorId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Aufgabe wählen --</option>
                {allTasks.map(task => (
                  <option key={task.id} value={task.id} disabled={task.id === successorId}>
                    {task.wbs_code} - {task.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Successor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nachfolger (wartet auf Vorgaenger)
              </label>
              <select
                value={successorId}
                onChange={e => setSuccessorId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Aufgabe wählen --</option>
                {allTasks.map(task => (
                  <option key={task.id} value={task.id} disabled={task.id === predecessorId}>
                    {task.wbs_code} - {task.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Dependency Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abhängigkeitstyp
              </label>
              <select
                value={dependencyType}
                onChange={e => setDependencyType(e.target.value as DependencyType)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(dependencyTypeLabels).map(([type, { label }]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {dependencyTypeLabels[dependencyType].description}
              </p>
            </div>

            {/* Lag Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verzoegerung (Tage)
              </label>
              <input
                type="number"
                value={lagDays}
                onChange={e => setLagDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Negative Werte = Vorlaufzeit
              </p>
            </div>
          </div>

          {/* Circular dependency warning */}
          {wouldCreateCycle && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
              <strong>Warnung:</strong> Diese Abhängigkeit wuerde einen Zyklus erzeugen und kann nicht hinzugefuegt werden.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px]"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !predecessorId || !successorId || wouldCreateCycle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Speichern...' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {/* Dependencies list */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vorgaenger</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Typ</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nachfolger</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Lag</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {template.dependencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                  Keine Abhängigkeiten definiert
                </td>
              </tr>
            ) : (
              template.dependencies.map(dep => {
                const pred = getTask(dep.predecessor_task_id)
                const succ = getTask(dep.successor_task_id)
                const isHovered = hoveredDepId === dep.id
                const affected = isHovered ? getAffectedForDep(dep) : null

                return (
                  <tr
                    key={dep.id}
                    onMouseEnter={() => setHoveredDepId(dep.id)}
                    onMouseLeave={() => setHoveredDepId(null)}
                    className={isHovered ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-500">{pred?.wbs_code}</span>
                        <span className="text-sm text-gray-900">{pred?.name || 'Unbekannt'}</span>
                        {isHovered && affected && affected.prerequisites.length > 0 && (
                          <span className="text-xs text-blue-600 mt-1">
                            + {affected.prerequisites.length} Vorgaenger
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {dep.dependency_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-500">{succ?.wbs_code}</span>
                        <span className="text-sm text-gray-900">{succ?.name || 'Unbekannt'}</span>
                        {isHovered && affected && affected.dependents.length > 0 && (
                          <span className="text-xs text-purple-600 mt-1">
                            + {affected.dependents.length} Nachfolger
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${dep.lag_days === 0 ? 'text-gray-400' : dep.lag_days > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {dep.lag_days > 0 ? `+${dep.lag_days}` : dep.lag_days}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(dep.id)}
                        disabled={loading}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Typen:</strong></p>
        <ul className="grid grid-cols-2 gap-x-4">
          {Object.entries(dependencyTypeLabels).map(([type, { label, description }]) => (
            <li key={type}><span className="font-medium">{type}</span> = {description}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
