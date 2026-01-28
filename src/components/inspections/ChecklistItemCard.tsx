'use client'

/**
 * ChecklistItemCard Component
 *
 * Single checklist item with result buttons and photo support.
 *
 * Phase 22-02: Inspection UI
 */

import { useState } from 'react'
import type { ChecklistItem, ChecklistItemResult } from '@/types/inspections'

interface ChecklistItemCardProps {
  item: ChecklistItem
  result: ChecklistItemResult | null
  onResultChange: (result: ChecklistItemResult) => void
  onAddPhoto: () => void
  photoCount: number
  onLogDefect?: () => void
}

export function ChecklistItemCard({
  item,
  result,
  onResultChange,
  onAddPhoto,
  photoCount,
  onLogDefect,
}: ChecklistItemCardProps) {
  const [notes, setNotes] = useState(result?.notes || '')

  const updateResult = (status: 'pass' | 'fail' | 'na') => {
    onResultChange({
      item_id: item.id,
      status,
      notes: notes || null,
      checked_at: new Date().toISOString(),
      photo_storage_paths: result?.photo_storage_paths || [],
    })
  }

  // Border color based on result
  let borderColor = 'border-gray-200 dark:border-gray-700'
  if (result?.status === 'pass') borderColor = 'border-l-4 border-l-green-500'
  else if (result?.status === 'fail') borderColor = 'border-l-4 border-l-red-500'
  else if (result?.status === 'na') borderColor = 'border-l-4 border-l-gray-400'

  return (
    <div className={`p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-3 ${borderColor}`}>
      {/* Item info */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h4>
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
        )}
      </div>

      {/* Result buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => updateResult('pass')}
          className={`min-h-[48px] px-4 py-2 rounded-lg transition-colors ${
            result?.status === 'pass'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ✓ Bestanden
        </button>
        <button
          onClick={() => updateResult('fail')}
          className={`min-h-[48px] px-4 py-2 rounded-lg transition-colors ${
            result?.status === 'fail'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ✗ Nicht bestanden
        </button>
        <button
          onClick={() => updateResult('na')}
          className={`min-h-[48px] px-4 py-2 rounded-lg transition-colors ${
            result?.status === 'na'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          N/A
        </button>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (result) {
            onResultChange({ ...result, notes: notes || null })
          }
        }}
        placeholder="Notizen (optional)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        rows={2}
      />

      {/* Photo button */}
      <button
        onClick={onAddPhoto}
        className="min-h-[48px] text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        + Foto ({photoCount})
      </button>

      {/* Defect prompt for failed items */}
      {result?.status === 'fail' && onLogDefect && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Mangel erfassen?</p>
          <button
            onClick={onLogDefect}
            className="min-h-[48px] px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
          >
            Mangel hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
