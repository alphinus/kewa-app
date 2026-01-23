'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoomManager } from './RoomManager'
import type { Unit, Room } from '@/types/database'
import type { UnitType } from '@/types'

// =============================================
// TYPES
// =============================================

interface UnitEditorProps {
  unit: Unit
  onSave: () => void
  onDelete: () => void
  onCancel: () => void
}

// Unit types
const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'apartment', label: 'Wohnung' },
  { value: 'common_area', label: 'Gemeinschaftsraum' },
  { value: 'building', label: 'Gesamtes Gebäude' },
  { value: 'parking_spot', label: 'Parkplatz' },
]

// =============================================
// COMPONENT
// =============================================

/**
 * UnitEditor - Modal for editing unit details
 *
 * Features:
 * - Edit basic unit information (name, type, floor, position)
 * - Manage tenant information for apartments
 * - Manage rooms within the unit
 * - Delete unit with confirmation
 */
export function UnitEditor({
  unit,
  onSave,
  onDelete,
  onCancel,
}: UnitEditorProps) {
  // Form state
  const [name, setName] = useState(unit.name)
  const [unitType, setUnitType] = useState<UnitType>(unit.unit_type)
  const [floor, setFloor] = useState(unit.floor?.toString() || '')
  const [position, setPosition] = useState(unit.position || '')
  const [tenantName, setTenantName] = useState(unit.tenant_name || '')
  const [tenantVisible, setTenantVisible] = useState(
    unit.tenant_visible_to_imeri
  )
  const [rentAmount, setRentAmount] = useState(
    unit.rent_amount?.toString() || ''
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'details' | 'rooms'>('details')

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsKey, setRoomsKey] = useState(0)

  /**
   * Load rooms for this unit
   */
  useEffect(() => {
    if (activeTab === 'rooms') {
      loadRooms()
    }
  }, [activeTab, unit.id])

  /**
   * Fetch rooms from API
   */
  async function loadRooms() {
    try {
      const response = await fetch(`/api/units/${unit.id}/rooms`)
      if (!response.ok) throw new Error('Failed to fetch rooms')

      const data = await response.json()
      setRooms(data.rooms || [])
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  /**
   * Validate form
   */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich'
    }

    if (floor && isNaN(parseInt(floor))) {
      newErrors.floor = 'Stockwerk muss eine Zahl sein'
    }

    if (rentAmount && isNaN(parseFloat(rentAmount))) {
      newErrors.rentAmount = 'Miete muss eine Zahl sein'
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
        name: name.trim(),
        unit_type: unitType,
        floor: floor ? parseInt(floor) : null,
        position: position.trim() || null,
        tenant_name: tenantName.trim() || null,
        tenant_visible_to_imeri: tenantVisible,
        rent_amount: rentAmount ? parseFloat(rentAmount) : null,
      }

      const response = await fetch(`/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      onSave()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle delete with confirmation
   */
  async function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      setDeleting(true)

      const response = await fetch(`/api/units/${unit.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Löschen')
      }

      onDelete()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      })
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  /**
   * Handle rooms updated
   */
  function handleRoomsUpdated() {
    setRoomsKey((prev) => prev + 1)
    loadRooms()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <Card className="w-full sm:max-w-3xl sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Einheit bearbeiten
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Schliessen"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4 border-b border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Details
              </button>
              {unitType === 'apartment' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'rooms'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Räume ({rooms.length})
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Error message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {activeTab === 'details' ? (
              <>
                {/* Name */}
                <Input
                  label="Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. EG Links"
                  error={errors.name}
                  required
                />

                {/* Unit Type */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Typ *
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {UNIT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floor */}
                <Input
                  label="Stockwerk"
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="z.B. 0 (EG), 1 (1.OG), -1 (UG)"
                  error={errors.floor}
                />

                {/* Position */}
                <Input
                  label="Position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="z.B. 0, 1, 2 oder links, mitte, rechts"
                />

                {/* Tenant Info (apartments only) */}
                {unitType === 'apartment' && (
                  <>
                    <Input
                      label="Mieter"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Name des Mieters"
                    />

                    <div className="w-full">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tenantVisible}
                          onChange={(e) => setTenantVisible(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mieter für Imeri sichtbar
                        </span>
                      </label>
                    </div>

                    <Input
                      label="Miete (CHF)"
                      type="number"
                      step="0.01"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="z.B. 1500.00"
                      error={errors.rentAmount}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Rooms Tab */}
                <RoomManager
                  key={roomsKey}
                  unitId={unit.id}
                  rooms={rooms}
                  onRoomsUpdated={handleRoomsUpdated}
                />
              </>
            )}
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
            {/* Delete Button (only on details tab) */}
            {activeTab === 'details' && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={saving || deleting}
                loading={deleting}
              >
                {showDeleteConfirm ? 'Bestätigen' : 'Löschen'}
              </Button>
            )}

            <div className="flex-1" />

            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving || deleting}
            >
              Abbrechen
            </Button>

            {activeTab === 'details' && (
              <Button type="submit" loading={saving} disabled={deleting}>
                Speichern
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
