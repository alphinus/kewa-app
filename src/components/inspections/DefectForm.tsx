'use client'

/**
 * DefectForm Component
 *
 * Form to create a defect with severity selector and photo nudge.
 *
 * Phase 22-02: Inspection UI
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DefectSeverity } from '@/types/inspections'

interface DefectFormProps {
  inspectionId: string
  checklistItemId?: string
  onClose: () => void
  onCreated: () => void
}

export function DefectForm({
  inspectionId,
  checklistItemId,
  onClose,
  onCreated,
}: DefectFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<DefectSeverity>('mittel')
  const [photos, setPhotos] = useState<File[]>([])
  const [showPhotoNudge, setShowPhotoNudge] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos((prev) => [...prev, ...files])
  }

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Photo nudge if no photos
    if (photos.length === 0 && !showPhotoNudge) {
      setShowPhotoNudge(true)
      return
    }

    setIsSubmitting(true)

    try {
      // Create defect
      const res = await fetch(`/api/inspections/${inspectionId}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          title: title.trim(),
          description: description.trim() || undefined,
          severity,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create defect')
      }

      const data = await res.json()
      const defectId = data.defect.id

      // Upload photos if any
      for (const photo of photos) {
        const formData = new FormData()
        formData.append('file', photo)

        const photoRes = await fetch(
          `/api/inspections/${inspectionId}/defects/${defectId}/photos`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!photoRes.ok) {
          console.error('Failed to upload photo')
        }
      }

      onCreated()
    } catch (err) {
      console.error('Error creating defect:', err)
      toast.error('Fehler beim Erstellen des Mangels')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Mangel erfassen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="z.B. Kratzer an Oberfläche"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Details zum Mangel..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schweregrad <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    value="gering"
                    checked={severity === 'gering'}
                    onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Gering
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Kosmetisch, keine Funktionsbeeinträchtigung
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    value="mittel"
                    checked={severity === 'mittel'}
                    onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Mittel
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Funktional beeinträchtigt, aber nutzbar
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    value="schwer"
                    checked={severity === 'schwer'}
                    onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Schwer
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Muss vor Abnahme behoben werden
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fotos ({photos.length})
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />

              {photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photo nudge */}
            {showPhotoNudge && photos.length === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Möchten Sie ein Foto hinzufügen? (Optional)
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  >
                    Foto hinzufügen
                  </Button>
                  <Button type="submit" variant="secondary" disabled={isSubmitting}>
                    {isSubmitting ? 'Speichern...' : 'Ohne Foto speichern'}
                  </Button>
                </div>
              </div>
            )}

            {/* Submit */}
            {!showPhotoNudge && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Speichern...' : 'Mangel speichern'}
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Abbrechen
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
