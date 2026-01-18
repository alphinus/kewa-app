'use client'

import { useState } from 'react'
import type {
  TemplateQualityGate,
  TemplateChecklistItem
} from '@/types/templates'
import type { GateLevel } from '@/types'

interface QualityGateEditorProps {
  templateId: string
  phases: Array<{ id: string; name: string; wbs_code: string }>
  packages: Array<{ id: string; name: string; wbs_code: string; phase_id: string }>
  existingGates: TemplateQualityGate[]
  onSave: (gate: Partial<TemplateQualityGate>) => Promise<void>
  onDelete: (gateId: string) => Promise<void>
}

/**
 * QualityGateEditor Component
 *
 * Editor for template quality gates with checklist items,
 * photo requirements, and blocking configuration.
 */
export function QualityGateEditor({
  templateId,
  phases,
  packages,
  existingGates,
  onSave,
  onDelete
}: QualityGateEditorProps) {
  const [selectedLevel, setSelectedLevel] = useState<GateLevel>('phase')
  const [selectedParent, setSelectedParent] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [checklistItems, setChecklistItems] = useState<TemplateChecklistItem[]>([])
  const [minPhotos, setMinPhotos] = useState(0)
  const [isBlocking, setIsBlocking] = useState(false)
  const [autoApprove, setAutoApprove] = useState(true)
  const [editingGate, setEditingGate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      { id: crypto.randomUUID(), text: '', required: true }
    ])
  }

  const updateChecklistItem = (index: number, updates: Partial<TemplateChecklistItem>) => {
    const updated = [...checklistItems]
    updated[index] = { ...updated[index], ...updates }
    setChecklistItems(updated)
  }

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name ist erforderlich')
      return
    }
    if (!selectedParent) {
      setError('Bitte eine Phase oder ein Paket waehlen')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const gate: Partial<TemplateQualityGate> = {
        template_id: templateId,
        gate_level: selectedLevel,
        phase_id: selectedLevel === 'phase' ? selectedParent : null,
        package_id: selectedLevel === 'package' ? selectedParent : null,
        name: name.trim(),
        description: description.trim() || null,
        checklist_items: checklistItems.filter(i => i.text.trim()),
        min_photos_required: minPhotos,
        is_blocking: isBlocking,
        auto_approve_when_complete: autoApprove
      }

      if (editingGate) {
        gate.id = editingGate
      }

      await onSave(gate)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setChecklistItems([])
    setMinPhotos(0)
    setIsBlocking(false)
    setAutoApprove(true)
    setEditingGate(null)
    setSelectedParent('')
    setError(null)
  }

  const editGate = (gate: TemplateQualityGate) => {
    setEditingGate(gate.id)
    setSelectedLevel(gate.gate_level)
    setSelectedParent(gate.phase_id || gate.package_id || '')
    setName(gate.name)
    setDescription(gate.description || '')
    setChecklistItems([...gate.checklist_items])
    setMinPhotos(gate.min_photos_required)
    setIsBlocking(gate.is_blocking)
    setAutoApprove(gate.auto_approve_when_complete)
    setError(null)
  }

  const handleDelete = async (gateId: string) => {
    if (!confirm('Quality Gate wirklich loeschen?')) return

    setSaving(true)
    setError(null)
    try {
      await onDelete(gateId)
      if (editingGate === gateId) {
        resetForm()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setSaving(false)
    }
  }

  const parentOptions = selectedLevel === 'phase' ? phases : packages

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Quality Gates</h3>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Existing gates list */}
      {existingGates.length > 0 && (
        <div className="space-y-2">
          {existingGates.map(gate => (
            <div
              key={gate.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                editingGate === gate.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div>
                <div className="font-medium">{gate.name}</div>
                <div className="text-sm text-gray-500">
                  {gate.gate_level === 'phase' ? 'Phase' : 'Paket'} |{' '}
                  {gate.checklist_items.length} Checkpunkte |{' '}
                  {gate.min_photos_required} Fotos erforderlich
                  {gate.is_blocking && ' | Blockierend'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editGate(gate)}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 min-h-[32px]"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(gate.id)}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 min-h-[32px]"
                >
                  Loeschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">
          {editingGate ? 'Gate bearbeiten' : 'Neues Quality Gate'}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gate-Ebene
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value as GateLevel)
                setSelectedParent('')
              }}
              disabled={saving}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            >
              <option value="phase">Phase</option>
              <option value="package">Paket</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedLevel === 'phase' ? 'Phase' : 'Paket'}
            </label>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            >
              <option value="">Waehlen...</option>
              {parentOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.wbs_code} - {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gate-Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Demontage abgeschlossen"
            disabled={saving}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beschreibung (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
          />
        </div>

        {/* Checklist items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Checkliste
          </label>
          <div className="space-y-2">
            {checklistItems.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                  placeholder="Checkpunkt beschreiben"
                  disabled={saving}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(e) => updateChecklistItem(index, { required: e.target.checked })}
                    disabled={saving}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Pflicht
                </label>
                <button
                  onClick={() => removeChecklistItem(index)}
                  disabled={saving}
                  className="p-2 text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Entfernen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={addChecklistItem}
              disabled={saving}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              + Checkpunkt hinzufuegen
            </button>
          </div>
        </div>

        {/* Photo requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mindestanzahl Fotos
          </label>
          <input
            type="number"
            value={minPhotos}
            onChange={(e) => setMinPhotos(parseInt(e.target.value) || 0)}
            min={0}
            disabled={saving}
            className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Options */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBlocking}
              onChange={(e) => setIsBlocking(e.target.checked)}
              disabled={saving}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Blockiert Fortschritt</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              disabled={saving}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Auto-Freigabe wenn vollstaendig</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !selectedParent || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Speichern...' : editingGate ? 'Aktualisieren' : 'Hinzufuegen'}
          </button>
          {editingGate && (
            <button
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 min-h-[44px]"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
