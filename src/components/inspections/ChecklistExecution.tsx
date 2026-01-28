'use client'

/**
 * ChecklistExecution Component
 *
 * Full checklist execution interface with section grouping.
 *
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChecklistItemCard } from './ChecklistItemCard'
import { DefectForm } from './DefectForm'
import type { Inspection, ChecklistSectionResult, ChecklistItemResult } from '@/types/inspections'

interface ChecklistExecutionProps {
  inspection: Inspection
  onSave: (updatedItems: ChecklistSectionResult[]) => Promise<void>
}

export function ChecklistExecution({ inspection, onSave }: ChecklistExecutionProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistSectionResult[]>(
    inspection.checklist_items || []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Defect form state
  const [isDefectFormOpen, setIsDefectFormOpen] = useState(false)
  const [defectChecklistItemId, setDefectChecklistItemId] = useState<string | null>(null)

  // Calculate progress
  const totalItems = checklistItems.reduce((sum, section) => sum + section.items.length, 0)
  const checkedItems = checklistItems.reduce(
    (sum, section) =>
      sum + section.items.filter((item) => item.status !== 'na' || item.notes).length,
    0
  )

  // Expand all sections by default
  useEffect(() => {
    const sectionIds = checklistItems.map((section) => section.section_id)
    setExpandedSections(new Set(sectionIds))
  }, [])

  // Auto-save with debounce
  const debouncedSave = useCallback(() => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        await onSave(checklistItems)
      } catch (err) {
        console.error('Auto-save failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, 3000)

    setSaveTimer(timer)
  }, [checklistItems, onSave, saveTimer])

  useEffect(() => {
    debouncedSave()

    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
      }
    }
  }, [checklistItems])

  const handleResultChange = (sectionId: string, updatedResult: ChecklistItemResult) => {
    setChecklistItems((prev) =>
      prev.map((section) => {
        if (section.section_id !== sectionId) return section

        return {
          ...section,
          items: section.items.map((item) =>
            item.item_id === updatedResult.item_id ? updatedResult : item
          ),
        }
      })
    )
  }

  const handlePhotoUpload = async (sectionId: string, itemId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('item_id', itemId)

        const res = await fetch(`/api/inspections/${inspection.id}/photos`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error('Failed to upload photo')
        }

        const data = await res.json()

        // Update checklist items with new photo path
        setChecklistItems((prev) =>
          prev.map((section) => {
            if (section.section_id !== sectionId) return section

            return {
              ...section,
              items: section.items.map((item) => {
                if (item.item_id !== itemId) return item

                return {
                  ...item,
                  photo_storage_paths: [
                    ...item.photo_storage_paths,
                    data.photo.path,
                  ],
                }
              }),
            }
          })
        )
      } catch (err) {
        console.error('Photo upload error:', err)
        alert('Fehler beim Hochladen des Fotos')
      }
    }
    input.click()
  }

  const handleLogDefect = (sectionId: string, itemId: string) => {
    setDefectChecklistItemId(itemId)
    setIsDefectFormOpen(true)
  }

  const handleManualSave = async () => {
    setIsSaving(true)
    try {
      await onSave(checklistItems)
      alert('Checkliste gespeichert')
    } catch (err) {
      console.error('Save failed:', err)
      alert('Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fortschritt
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {checkedItems} / {totalItems}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {checklistItems.map((section) => {
        const sectionCheckedItems = section.items.filter(
          (item) => item.status !== 'na' || item.notes
        ).length
        const isExpanded = expandedSections.has(section.section_id)

        return (
          <div
            key={section.section_id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.section_id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {section.name}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {sectionCheckedItems}/{section.items.length} geprüft
                </span>
              </div>
              <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {/* Section items */}
            {isExpanded && (
              <div className="p-4 pt-0 space-y-3">
                {section.items.map((item, index) => (
                  <ChecklistItemCard
                    key={item.item_id}
                    item={{
                      id: item.item_id,
                      title: `Item ${index + 1}`, // TODO: Lookup from template
                      description: null,
                    }}
                    result={item}
                    onResultChange={(updatedResult) =>
                      handleResultChange(section.section_id, updatedResult)
                    }
                    onAddPhoto={() => handlePhotoUpload(section.section_id, item.item_id)}
                    photoCount={item.photo_storage_paths?.length || 0}
                    onLogDefect={() => handleLogDefect(section.section_id, item.item_id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleManualSave} disabled={isSaving}>
          {isSaving ? 'Speichern...' : 'Alle speichern'}
        </Button>
        {isSaving && (
          <span className="text-sm text-gray-500 dark:text-gray-400">Auto-Speicherung...</span>
        )}
      </div>

      {/* Defect form modal */}
      {isDefectFormOpen && (
        <DefectForm
          inspectionId={inspection.id}
          checklistItemId={defectChecklistItemId || undefined}
          onClose={() => {
            setIsDefectFormOpen(false)
            setDefectChecklistItemId(null)
          }}
          onCreated={() => {
            setIsDefectFormOpen(false)
            setDefectChecklistItemId(null)
            // Refresh inspection to show new defect
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
