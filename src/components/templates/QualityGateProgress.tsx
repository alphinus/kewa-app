'use client'

import { useState } from 'react'
import type { ProjectQualityGateWithCompletion } from '@/types/templates'

interface QualityGateProgressProps {
  gate: ProjectQualityGateWithCompletion
  isAdmin?: boolean
  onToggleChecklistItem: (gateId: string, itemId: string) => Promise<void>
  onApprove: (gateId: string) => Promise<void>
  onUploadPhoto?: (gateId: string, file: File) => Promise<void>
}

/**
 * QualityGateProgress Component
 *
 * Runtime component for tracking quality gate progress,
 * including interactive checklist and photo upload.
 */
export function QualityGateProgress({
  gate,
  isAdmin = false,
  onToggleChecklistItem,
  onApprove,
  onUploadPhoto
}: QualityGateProgressProps) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    passed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }

  const statusLabels = {
    pending: 'Ausstehend',
    passed: 'Bestanden',
    failed: 'Fehlgeschlagen'
  }

  const handleToggle = async (itemId: string) => {
    if (gate.status === 'passed') return

    setToggling(itemId)
    try {
      await onToggleChecklistItem(gate.id, itemId)
    } finally {
      setToggling(null)
    }
  }

  const handleApprove = async () => {
    if (gate.status === 'passed') return

    setApproving(true)
    try {
      await onApprove(gate.id)
    } finally {
      setApproving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadPhoto || gate.status === 'passed') return

    setUploading(true)
    try {
      await onUploadPhoto(gate.id, file)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const isItemChecked = (itemId: string) => {
    const progress = gate.checklist_progress as Array<{
      id: string
      completed: boolean
      completed_at: string | null
      completed_by: string | null
    }> | null
    return progress?.find(p => p.id === itemId)?.completed ?? false
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{gate.name}</h4>
            {gate.description && (
              <p className="text-sm text-gray-500 mt-1">{gate.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gate.is_blocking && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                Blockierend
              </span>
            )}
            <span className={`px-2 py-1 text-xs rounded ${statusColors[gate.status]}`}>
              {statusLabels[gate.status]}
            </span>
          </div>
        </div>

        {/* Progress summary */}
        {gate.status !== 'passed' && (
          <div className="flex gap-4 mt-3 text-sm">
            <div className={gate.completion.checklist_complete ? 'text-green-600' : 'text-gray-500'}>
              Checkliste: {gate.completion.checklist_progress}
            </div>
            <div className={gate.completion.photos_complete ? 'text-green-600' : 'text-gray-500'}>
              Fotos: {gate.completion.photos_progress}
            </div>
          </div>
        )}
      </div>

      {/* Checklist */}
      {gate.checklist_items.length > 0 && (
        <div className="p-4 border-b">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Checkliste</h5>
          <div className="space-y-2">
            {gate.checklist_items.map(item => {
              const checked = isItemChecked(item.id)
              const isToggling = toggling === item.id
              const disabled = gate.status === 'passed' || isToggling

              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(item.id)}
                    disabled={disabled}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`flex-1 ${checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.text}
                    {item.required && !checked && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </span>
                  {isToggling && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Photos */}
      {gate.min_photos_required > 0 && (
        <div className="p-4 border-b">
          <h5 className="text-sm font-medium text-gray-700 mb-3">
            Fotos ({gate.photos?.length || 0}/{gate.min_photos_required})
          </h5>

          {/* Photo grid */}
          {gate.photos && gate.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {gate.photos.map(photo => (
                <div
                  key={photo.id}
                  className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center overflow-hidden"
                  title={photo.file_name}
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {gate.status !== 'passed' && onUploadPhoto && (
            <label className={`inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer min-h-[44px] ${
              uploading ? 'opacity-50 cursor-wait' : ''
            }`}>
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Foto hochladen
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading || gate.status === 'passed'}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}

      {/* Actions */}
      {gate.status === 'pending' && (
        <div className="p-4 bg-gray-50">
          {gate.completion.is_complete && gate.auto_approve_when_complete ? (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Wird automatisch freigegeben...
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {!gate.completion.is_complete ? (
                <div className="text-sm text-gray-500">
                  Alle Anforderungen erfuellen fuer Freigabe
                </div>
              ) : (
                <div className="text-sm text-green-600">
                  Alle Anforderungen erfuellt
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                >
                  {approving ? 'Wird freigegeben...' : 'Manuell freigeben'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {gate.status === 'passed' && (
        <div className="p-4 bg-green-50 text-green-700 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Quality Gate bestanden
          {gate.approved_at && (
            <span className="text-green-600">
              am {new Date(gate.approved_at).toLocaleDateString('de-CH')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * QualityGateProgressList Component
 *
 * Display a list of quality gates with their progress status.
 */
interface QualityGateProgressListProps {
  gates: ProjectQualityGateWithCompletion[]
  isAdmin?: boolean
  onToggleChecklistItem: (gateId: string, itemId: string) => Promise<void>
  onApprove: (gateId: string) => Promise<void>
  onUploadPhoto?: (gateId: string, file: File) => Promise<void>
}

export function QualityGateProgressList({
  gates,
  isAdmin = false,
  onToggleChecklistItem,
  onApprove,
  onUploadPhoto
}: QualityGateProgressListProps) {
  if (gates.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Keine Quality Gates definiert
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {gates.map(gate => (
        <QualityGateProgress
          key={gate.id}
          gate={gate}
          isAdmin={isAdmin}
          onToggleChecklistItem={onToggleChecklistItem}
          onApprove={onApprove}
          onUploadPhoto={onUploadPhoto}
        />
      ))}
    </div>
  )
}
