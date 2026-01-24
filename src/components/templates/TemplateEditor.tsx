'use client'

import { useState, useCallback } from 'react'
import type {
  TemplateWithHierarchy,
  TemplatePhaseWithPackages,
  TemplatePackageWithTasks,
  TemplateTask,
  CreateTemplatePhaseInput,
  CreateTemplatePackageInput,
  CreateTemplateTaskInput
} from '@/types/templates'
import type { TradeCategory } from '@/types'
import { WBSTree } from './WBSTree'
import {
  createPhase,
  updatePhase,
  deletePhase,
  createPackage,
  updatePackage,
  deletePackage,
  createTask,
  updateTask,
  deleteTask
} from '@/lib/api/templates'

interface DraggedItem {
  type: 'phase' | 'package' | 'task'
  id: string
  parentId?: string
}

async function reorderItems(
  templateId: string,
  type: 'phase' | 'package' | 'task',
  items: Array<{ id: string; sort_order: number }>
) {
  const response = await fetch(`/api/templates/${templateId}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, items })
  })
  if (!response.ok) throw new Error('Reorder failed')
}

interface TemplateEditorProps {
  template: TemplateWithHierarchy
  onUpdate?: () => void
}

type EditMode = 'none' | 'phase' | 'package' | 'task'

interface PhaseFormData {
  name: string
  description: string
  wbs_code: string
}

interface PackageFormData {
  name: string
  description: string
  wbs_code: string
  trade_category: TradeCategory | ''
  phase_id: string
}

interface TaskFormData {
  name: string
  description: string
  wbs_code: string
  estimated_duration_days: number
  estimated_cost: string
  trade_category: TradeCategory | ''
  is_optional: boolean
  notes: string
  package_id: string
}

const tradeCategories: { value: TradeCategory; label: string }[] = [
  { value: 'general', label: 'Allgemein' },
  { value: 'plumbing', label: 'Sanitaer' },
  { value: 'electrical', label: 'Elektro' },
  { value: 'hvac', label: 'Heizung/Lueftung' },
  { value: 'painting', label: 'Maler' },
  { value: 'flooring', label: 'Bodenbelag' },
  { value: 'carpentry', label: 'Schreiner' },
  { value: 'roofing', label: 'Dachdecker' },
  { value: 'masonry', label: 'Maurer' },
  { value: 'glazing', label: 'Glaser' },
  { value: 'landscaping', label: 'Gartenbau' },
  { value: 'cleaning', label: 'Reinigung' },
  { value: 'demolition', label: 'Abbruch' },
  { value: 'other', label: 'Sonstige' }
]

/**
 * TemplateEditor Component
 *
 * Full editing interface for template WBS structure.
 * Supports CRUD for phases, packages, and tasks.
 */
export function TemplateEditor({ template, onUpdate }: TemplateEditorProps) {
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [phaseForm, setPhaseForm] = useState<PhaseFormData>({
    name: '',
    description: '',
    wbs_code: ''
  })

  const [packageForm, setPackageForm] = useState<PackageFormData>({
    name: '',
    description: '',
    wbs_code: '',
    trade_category: '',
    phase_id: ''
  })

  const [taskForm, setTaskForm] = useState<TaskFormData>({
    name: '',
    description: '',
    wbs_code: '',
    estimated_duration_days: 1,
    estimated_cost: '',
    trade_category: '',
    is_optional: false,
    notes: '',
    package_id: ''
  })

  // Reset all forms
  const resetForms = useCallback(() => {
    setEditMode('none')
    setEditingId(null)
    setError(null)
    setPhaseForm({ name: '', description: '', wbs_code: '' })
    setPackageForm({ name: '', description: '', wbs_code: '', trade_category: '', phase_id: '' })
    setTaskForm({
      name: '',
      description: '',
      wbs_code: '',
      estimated_duration_days: 1,
      estimated_cost: '',
      trade_category: '',
      is_optional: false,
      notes: '',
      package_id: ''
    })
  }, [])

  // Generate next WBS code
  const getNextPhaseCode = () => {
    const codes = template.phases.map(p => parseInt(p.wbs_code)).filter(n => !isNaN(n))
    return String((codes.length > 0 ? Math.max(...codes) : 0) + 1)
  }

  const getNextPackageCode = (phaseId: string) => {
    const phase = template.phases.find(p => p.id === phaseId)
    if (!phase) return '1.1'
    const codes = (phase.packages || []).map(p => {
      const parts = p.wbs_code.split('.')
      return parseInt(parts[1] || '0')
    }).filter(n => !isNaN(n))
    return `${phase.wbs_code}.${(codes.length > 0 ? Math.max(...codes) : 0) + 1}`
  }

  const getNextTaskCode = (packageId: string) => {
    for (const phase of template.phases) {
      const pkg = (phase.packages || []).find(p => p.id === packageId)
      if (pkg) {
        const codes = (pkg.tasks || []).map(t => {
          const parts = t.wbs_code.split('.')
          return parseInt(parts[2] || '0')
        }).filter(n => !isNaN(n))
        return `${pkg.wbs_code}.${(codes.length > 0 ? Math.max(...codes) : 0) + 1}`
      }
    }
    return '1.1.1'
  }

  // Open add phase form
  const openAddPhase = () => {
    setEditMode('phase')
    setEditingId(null)
    setPhaseForm({
      name: '',
      description: '',
      wbs_code: getNextPhaseCode()
    })
  }

  // Open add package form
  const openAddPackage = (phaseId: string) => {
    setEditMode('package')
    setEditingId(null)
    setPackageForm({
      name: '',
      description: '',
      wbs_code: getNextPackageCode(phaseId),
      trade_category: '',
      phase_id: phaseId
    })
  }

  // Open add task form
  const openAddTask = (packageId: string) => {
    setEditMode('task')
    setEditingId(null)
    setTaskForm({
      name: '',
      description: '',
      wbs_code: getNextTaskCode(packageId),
      estimated_duration_days: 1,
      estimated_cost: '',
      trade_category: '',
      is_optional: false,
      notes: '',
      package_id: packageId
    })
  }

  // Save phase
  const savePhase = async () => {
    if (!phaseForm.name || !phaseForm.wbs_code) {
      setError('Name und WBS-Code sind erforderlich')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (editingId) {
        await updatePhase(template.id, editingId, {
          name: phaseForm.name,
          description: phaseForm.description || null,
          wbs_code: phaseForm.wbs_code
        })
      } else {
        await createPhase(template.id, {
          name: phaseForm.name,
          description: phaseForm.description || undefined,
          wbs_code: phaseForm.wbs_code
        })
      }
      resetForms()
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  // Save package
  const savePackage = async () => {
    if (!packageForm.name || !packageForm.wbs_code || !packageForm.phase_id) {
      setError('Name, WBS-Code und Phase sind erforderlich')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (editingId) {
        await updatePackage(template.id, editingId, {
          name: packageForm.name,
          description: packageForm.description || null,
          wbs_code: packageForm.wbs_code,
          trade_category: packageForm.trade_category || null
        })
      } else {
        await createPackage(template.id, {
          phase_id: packageForm.phase_id,
          name: packageForm.name,
          description: packageForm.description || undefined,
          wbs_code: packageForm.wbs_code,
          trade_category: packageForm.trade_category || undefined
        })
      }
      resetForms()
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  // Save task
  const saveTask = async () => {
    if (!taskForm.name || !taskForm.wbs_code || !taskForm.package_id) {
      setError('Name, WBS-Code und Package sind erforderlich')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (editingId) {
        await updateTask(template.id, editingId, {
          name: taskForm.name,
          description: taskForm.description || null,
          wbs_code: taskForm.wbs_code,
          estimated_duration_days: taskForm.estimated_duration_days,
          estimated_cost: taskForm.estimated_cost ? parseFloat(taskForm.estimated_cost) : null,
          trade_category: taskForm.trade_category || null,
          is_optional: taskForm.is_optional,
          notes: taskForm.notes || null
        })
      } else {
        await createTask(template.id, {
          package_id: taskForm.package_id,
          name: taskForm.name,
          description: taskForm.description || undefined,
          wbs_code: taskForm.wbs_code,
          estimated_duration_days: taskForm.estimated_duration_days,
          estimated_cost: taskForm.estimated_cost ? parseFloat(taskForm.estimated_cost) : undefined,
          trade_category: taskForm.trade_category || undefined,
          is_optional: taskForm.is_optional,
          notes: taskForm.notes || undefined
        })
      }
      resetForms()
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  // Delete handlers
  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('Phase und alle enthaltenen Pakete und Aufgaben loeschen?')) return
    setLoading(true)
    try {
      await deletePhase(template.id, phaseId)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Paket und alle enthaltenen Aufgaben loeschen?')) return
    setLoading(true)
    try {
      await deletePackage(template.id, packageId)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Aufgabe loeschen?')) return
    setLoading(true)
    try {
      await deleteTask(template.id, taskId)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Add buttons */}
      <div className="flex gap-2">
        <button
          onClick={openAddPhase}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
        >
          + Phase hinzufuegen
        </button>
      </div>

      {/* Phase form */}
      {editMode === 'phase' && (
        <FormCard title={editingId ? 'Phase bearbeiten' : 'Neue Phase'} onClose={resetForms}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WBS-Code *</label>
              <input
                type="text"
                value={phaseForm.wbs_code}
                onChange={e => setPhaseForm(f => ({ ...f, wbs_code: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={phaseForm.name}
                onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. Vorbereitung & Demontage"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={phaseForm.description}
              onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForms} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px]">
              Abbrechen
            </button>
            <button
              onClick={savePhase}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </FormCard>
      )}

      {/* Package form */}
      {editMode === 'package' && (
        <FormCard title={editingId ? 'Paket bearbeiten' : 'Neues Paket'} onClose={resetForms}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WBS-Code *</label>
              <input
                type="text"
                value={packageForm.wbs_code}
                onChange={e => setPackageForm(f => ({ ...f, wbs_code: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. 1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={packageForm.name}
                onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. Baustelleneinrichtung"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gewerk</label>
            <select
              value={packageForm.trade_category}
              onChange={e => setPackageForm(f => ({ ...f, trade_category: e.target.value as TradeCategory | '' }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Kein Gewerk --</option>
              {tradeCategories.map(tc => (
                <option key={tc.value} value={tc.value}>{tc.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={packageForm.description}
              onChange={e => setPackageForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForms} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px]">
              Abbrechen
            </button>
            <button
              onClick={savePackage}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </FormCard>
      )}

      {/* Task form */}
      {editMode === 'task' && (
        <FormCard title={editingId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={resetForms}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WBS-Code *</label>
              <input
                type="text"
                value={taskForm.wbs_code}
                onChange={e => setTaskForm(f => ({ ...f, wbs_code: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. 1.1.1"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={taskForm.name}
                onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. Schutzfolien anbringen"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Tage)</label>
              <input
                type="number"
                min="1"
                value={taskForm.estimated_duration_days}
                onChange={e => setTaskForm(f => ({ ...f, estimated_duration_days: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kosten (CHF)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taskForm.estimated_cost}
                onChange={e => setTaskForm(f => ({ ...f, estimated_cost: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gewerk</label>
              <select
                value={taskForm.trade_category}
                onChange={e => setTaskForm(f => ({ ...f, trade_category: e.target.value as TradeCategory | '' }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Kein Gewerk --</option>
                {tradeCategories.map(tc => (
                  <option key={tc.value} value={tc.value}>{tc.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={taskForm.description}
              onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={taskForm.notes}
              onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_optional"
              checked={taskForm.is_optional}
              onChange={e => setTaskForm(f => ({ ...f, is_optional: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_optional" className="text-sm text-gray-700">
              Optionale Aufgabe (kann bei Anwendung deaktiviert werden)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForms} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px]">
              Abbrechen
            </button>
            <button
              onClick={saveTask}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </FormCard>
      )}

      {/* WBS Tree with edit actions */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4">WBS-Struktur</h3>
        <EditorTree
          templateId={template.id}
          phases={template.phases}
          onAddPackage={openAddPackage}
          onAddTask={openAddTask}
          onDeletePhase={handleDeletePhase}
          onDeletePackage={handleDeletePackage}
          onDeleteTask={handleDeleteTask}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  )
}

// Form card wrapper
function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}

// Editor tree with action buttons
interface EditorTreeProps {
  templateId: string
  phases: TemplatePhaseWithPackages[]
  onAddPackage: (phaseId: string) => void
  onAddTask: (packageId: string) => void
  onDeletePhase: (phaseId: string) => void
  onDeletePackage: (packageId: string) => void
  onDeleteTask: (taskId: string) => void
  onUpdate?: () => void
}

function EditorTree({
  templateId,
  phases,
  onAddPackage,
  onAddTask,
  onDeletePhase,
  onDeletePackage,
  onDeleteTask,
  onUpdate
}: EditorTreeProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(phases.map(p => p.id)))
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    new Set(phases.flatMap(p => p.packages?.map(pkg => pkg.id) || []))
  )
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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

  // Drag handlers for phases
  const handlePhaseDragStart = (e: React.DragEvent, phaseId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem({ type: 'phase', id: phaseId })
  }

  const handlePhaseDragOver = (e: React.DragEvent, phaseId: string) => {
    if (draggedItem?.type === 'phase' && draggedItem.id !== phaseId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverId(phaseId)
    }
  }

  const handlePhaseDrop = async (e: React.DragEvent, targetPhaseId: string) => {
    if (draggedItem?.type !== 'phase') return
    e.preventDefault()
    setDragOverId(null)

    const draggedIndex = phases.findIndex(p => p.id === draggedItem.id)
    const dropIndex = phases.findIndex(p => p.id === targetPhaseId)
    if (draggedIndex === dropIndex) return

    const reordered = [...phases]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, removed)

    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
    try {
      await reorderItems(templateId, 'phase', items)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to reorder phases:', err)
    }
    setDraggedItem(null)
  }

  // Drag handlers for packages
  const handlePackageDragStart = (e: React.DragEvent, pkgId: string, phaseId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem({ type: 'package', id: pkgId, parentId: phaseId })
  }

  const handlePackageDragOver = (e: React.DragEvent, pkgId: string, phaseId: string) => {
    if (draggedItem?.type === 'package' && draggedItem.parentId === phaseId && draggedItem.id !== pkgId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverId(pkgId)
    }
  }

  const handlePackageDrop = async (e: React.DragEvent, targetPkgId: string, phaseId: string) => {
    if (draggedItem?.type !== 'package' || draggedItem.parentId !== phaseId) return
    e.preventDefault()
    setDragOverId(null)

    const phase = phases.find(p => p.id === phaseId)
    if (!phase?.packages) return

    const draggedIndex = phase.packages.findIndex(p => p.id === draggedItem.id)
    const dropIndex = phase.packages.findIndex(p => p.id === targetPkgId)
    if (draggedIndex === dropIndex) return

    const reordered = [...phase.packages]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, removed)

    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
    try {
      await reorderItems(templateId, 'package', items)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to reorder packages:', err)
    }
    setDraggedItem(null)
  }

  // Drag handlers for tasks
  const handleTaskDragStart = (e: React.DragEvent, taskId: string, pkgId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem({ type: 'task', id: taskId, parentId: pkgId })
  }

  const handleTaskDragOver = (e: React.DragEvent, taskId: string, pkgId: string) => {
    if (draggedItem?.type === 'task' && draggedItem.parentId === pkgId && draggedItem.id !== taskId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverId(taskId)
    }
  }

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string, pkgId: string) => {
    if (draggedItem?.type !== 'task' || draggedItem.parentId !== pkgId) return
    e.preventDefault()
    setDragOverId(null)

    let tasks: TemplateTask[] | undefined
    for (const phase of phases) {
      const pkg = phase.packages?.find(p => p.id === pkgId)
      if (pkg) {
        tasks = pkg.tasks
        break
      }
    }
    if (!tasks) return

    const draggedIndex = tasks.findIndex(t => t.id === draggedItem.id)
    const dropIndex = tasks.findIndex(t => t.id === targetTaskId)
    if (draggedIndex === dropIndex) return

    const reordered = [...tasks]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, removed)

    const items = reordered.map((t, i) => ({ id: t.id, sort_order: i + 1 }))
    try {
      await reorderItems(templateId, 'task', items)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to reorder tasks:', err)
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverId(null)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  if (phases.length === 0) {
    return <div className="text-gray-500 text-sm p-4 text-center">Keine Phasen vorhanden</div>
  }

  return (
    <div className="space-y-1">
      {phases.map(phase => (
        <div key={phase.id} className="border rounded">
          {/* Phase */}
          <div
            draggable
            onDragStart={(e) => handlePhaseDragStart(e, phase.id)}
            onDragOver={(e) => handlePhaseDragOver(e, phase.id)}
            onDrop={(e) => handlePhaseDrop(e, phase.id)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            className={`flex items-center gap-2 p-2 bg-blue-50 cursor-grab active:cursor-grabbing ${
              dragOverId === phase.id ? 'bg-blue-100 border-2 border-blue-400' : ''
            } ${draggedItem?.id === phase.id ? 'opacity-50' : ''}`}
          >
            <button onClick={() => togglePhase(phase.id)} className="text-gray-400 hover:text-gray-600">
              <svg className={`w-4 h-4 transition-transform ${expandedPhases.has(phase.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="font-mono text-sm text-blue-600">{phase.wbs_code}</span>
            <span className="font-medium flex-1">{phase.name}</span>
            <button
              onClick={() => onAddPackage(phase.id)}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
            >
              + Paket
            </button>
            <button
              onClick={() => onDeletePhase(phase.id)}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
            >
              Loeschen
            </button>
          </div>

          {/* Packages */}
          {expandedPhases.has(phase.id) && phase.packages?.map(pkg => (
            <div key={pkg.id} className="ml-6 border-t">
              <div
                draggable
                onDragStart={(e) => handlePackageDragStart(e, pkg.id, phase.id)}
                onDragOver={(e) => handlePackageDragOver(e, pkg.id, phase.id)}
                onDrop={(e) => handlePackageDrop(e, pkg.id, phase.id)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={`flex items-center gap-2 p-2 bg-gray-50 cursor-grab active:cursor-grabbing ${
                  dragOverId === pkg.id ? 'bg-blue-100 border-2 border-blue-400' : ''
                } ${draggedItem?.id === pkg.id ? 'opacity-50' : ''}`}
              >
                <button onClick={() => togglePackage(pkg.id)} className="text-gray-400 hover:text-gray-600">
                  <svg className={`w-4 h-4 transition-transform ${expandedPackages.has(pkg.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span className="font-mono text-sm text-purple-600">{pkg.wbs_code}</span>
                <span className="flex-1">{pkg.name}</span>
                {pkg.trade_category && (
                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{pkg.trade_category}</span>
                )}
                <button
                  onClick={() => onAddTask(pkg.id)}
                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  + Aufgabe
                </button>
                <button
                  onClick={() => onDeletePackage(pkg.id)}
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                >
                  Loeschen
                </button>
              </div>

              {/* Tasks */}
              {expandedPackages.has(pkg.id) && pkg.tasks?.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleTaskDragStart(e, task.id, pkg.id)}
                  onDragOver={(e) => handleTaskDragOver(e, task.id, pkg.id)}
                  onDrop={(e) => handleTaskDrop(e, task.id, pkg.id)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                  className={`ml-6 flex items-center gap-2 p-2 border-t cursor-grab active:cursor-grabbing ${
                    dragOverId === task.id ? 'bg-blue-100 border-2 border-blue-400' : ''
                  } ${draggedItem?.id === task.id ? 'opacity-50' : ''}`}
                >
                  <span className="w-4" />
                  <span className="font-mono text-xs text-gray-500">{task.wbs_code}</span>
                  <span className="text-sm flex-1">{task.name}</span>
                  {task.is_optional && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">optional</span>
                  )}
                  <span className="text-xs text-gray-500">{task.estimated_duration_days}d</span>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    Loeschen
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
