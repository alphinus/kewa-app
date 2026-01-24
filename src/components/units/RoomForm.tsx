'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Room } from '@/types/database'
import type { RoomType } from '@/types'

// =============================================
// TYPES
// =============================================

interface RoomFormProps {
  /** Mode: create new or edit existing */
  mode: 'create' | 'edit'
  /** Existing room for edit mode */
  room?: Room
  /** Unit ID for create mode */
  unitId: string
  /** Callback on successful save */
  onSave: (room: Room) => void
  /** Callback on cancel */
  onCancel: () => void
}

// Room type options with German labels
const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'living_room', label: 'Wohnzimmer' },
  { value: 'bedroom', label: 'Zimmer' },
  { value: 'kitchen', label: 'Kueche' },
  { value: 'bathroom', label: 'Bad/WC' },
  { value: 'hallway', label: 'Korridor' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'storage', label: 'Abstellraum/Keller' },
  { value: 'laundry', label: 'Waschkueche' },
  { value: 'garage', label: 'Garage' },
  { value: 'office', label: 'Buero' },
  { value: 'other', label: 'Sonstiges' },
]

// =============================================
// COMPONENT
// =============================================

/**
 * Room create/edit form modal
 *
 * Allows creating and editing rooms with:
 * - Name (required)
 * - Room type (required)
 * - Area in m2 (optional)
 * - Notes (optional)
 *
 * Note: Condition is NOT editable - managed by Digital Twin automation.
 *
 * Phase 15-04: Unit Detail Page
 */
export function RoomForm({
  mode,
  room,
  unitId,
  onSave,
  onCancel
}: RoomFormProps) {
  // Form state
  const [name, setName] = useState(room?.name || '')
  const [roomType, setRoomType] = useState<RoomType>(room?.room_type || 'living_room')
  const [area, setArea] = useState(room?.area_sqm?.toString() || '')
  const [notes, setNotes] = useState(room?.notes || '')

  // UI state
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Validate form fields
   */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich'
    }

    if (!roomType) {
      newErrors.roomType = 'Raumtyp ist erforderlich'
    }

    // Validate area if provided
    if (area.trim()) {
      const areaNum = parseFloat(area)
      if (isNaN(areaNum) || areaNum <= 0) {
        newErrors.area = 'Flaeche muss eine positive Zahl sein'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    try {
      setSaving(true)

      const body = {
        unit_id: unitId,
        name: name.trim(),
        room_type: roomType,
        area_sqm: area.trim() ? parseFloat(area) : null,
        notes: notes.trim() || null,
      }

      const url = mode === 'create'
        ? '/api/rooms'
        : `/api/rooms/${room?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      onSave(data.room)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <Card className="w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Neuer Raum' : 'Raum bearbeiten'}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Schliessen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Error message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Name */}
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Wohnzimmer"
              error={errors.name}
              required
            />

            {/* Room Type */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Raumtyp *
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as RoomType)}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROOM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.roomType && (
                <p className="mt-1 text-sm text-red-500">{errors.roomType}</p>
              )}
            </div>

            {/* Area */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Flaeche
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="z.B. 15"
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  m2
                </span>
              </div>
              {errors.area && (
                <p className="mt-1 text-sm text-red-500">{errors.area}</p>
              )}
            </div>

            {/* Notes */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notizen
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusaetzliche Informationen..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Condition info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Der Zustand wird automatisch durch abgeschlossene Projekte aktualisiert.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex-1" />

            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Abbrechen
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              {mode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
