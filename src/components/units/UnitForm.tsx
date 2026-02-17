'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Unit } from '@/types/database'
import type { UnitType } from '@/types'

// =============================================
// TYPES
// =============================================

interface UnitFormProps {
  /** Mode: create new or edit existing */
  mode: 'create' | 'edit'
  /** Existing unit for edit mode */
  unit?: Unit
  /** Building ID for create mode */
  buildingId: string
  /** Callback on successful save */
  onSave: (unit: Unit) => void
  /** Callback on cancel */
  onCancel: () => void
}

// Floor options for dropdown
const FLOOR_OPTIONS = [
  { value: -1, label: 'UG' },
  { value: 0, label: 'EG' },
  { value: 1, label: '1. OG' },
  { value: 2, label: '2. OG' },
  { value: 3, label: '3. OG' },
  { value: 4, label: 'DG' },
]

// Size class options (Zimmer)
const SIZE_OPTIONS = [
  '1-Zi.', '1.5-Zi.', '2-Zi.', '2.5-Zi.', '3-Zi.', '3.5-Zi.',
  '4-Zi.', '4.5-Zi.', '5-Zi.', '5.5-Zi.', '6-Zi.'
]

// Unit type options
const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'apartment', label: 'Wohnung' },
  { value: 'common_area', label: 'Gemeinschaftsraum' },
]

// =============================================
// COMPONENT
// =============================================

/**
 * Unit create/edit form modal
 *
 * Allows creating and editing units with:
 * - Unit name and number
 * - Floor and size class
 * - Unit type (apartment/common area)
 * - Tenant information (name, phone, email, move-in date)
 * - Vacancy status
 */
export function UnitForm({
  mode,
  unit,
  buildingId,
  onSave,
  onCancel
}: UnitFormProps) {
  // Form state - unit fields
  const [name, setName] = useState(unit?.name || '')
  const [unitNumber, setUnitNumber] = useState(unit?.unit_number || '')
  const [floor, setFloor] = useState<number | null>(unit?.floor ?? null)
  const [sizeClass, setSizeClass] = useState(unit?.size_class || '')
  const [unitType, setUnitType] = useState<UnitType>(unit?.unit_type || 'apartment')

  // Form state - tenant fields
  const [tenantName, setTenantName] = useState(unit?.tenant_name || '')
  const [tenantPhone, setTenantPhone] = useState(unit?.tenant_phone || '')
  const [tenantEmail, setTenantEmail] = useState(unit?.tenant_email || '')
  const [moveInDate, setMoveInDate] = useState(unit?.tenant_move_in_date || '')
  const [isVacant, setIsVacant] = useState(unit?.is_vacant ?? true)

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

    // Validate email format if provided
    if (tenantEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(tenantEmail.trim())) {
        newErrors.tenantEmail = 'Ungültiges E-Mail-Format'
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

      // Determine vacancy status
      // Auto-vacant if no tenant name provided
      const computedVacant = !tenantName.trim() || isVacant

      const body = {
        building_id: buildingId,
        name: name.trim(),
        unit_number: unitNumber.trim() || null,
        unit_type: unitType,
        floor: floor,
        size_class: sizeClass || null,
        tenant_name: tenantName.trim() || null,
        tenant_phone: tenantPhone.trim() || null,
        tenant_email: tenantEmail.trim() || null,
        tenant_move_in_date: moveInDate || null,
        is_vacant: computedVacant,
      }

      const url = mode === 'create'
        ? '/api/units'
        : `/api/units/${unit?.id}`
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
      onSave(data.unit)
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
      <Card className="w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Neue Einheit' : 'Einheit bearbeiten'}
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

            {/* Unit Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                Einheit Details
              </h3>

              {/* Name */}
              <Input
                label="Einheit Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Wohnung 4.1"
                error={errors.name}
                required
              />

              {/* Unit Number */}
              <Input
                label="Einheitsnummer"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="z.B. 4.1"
              />

              {/* Floor and Size Class row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Floor */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Etage
                  </label>
                  <select
                    value={floor ?? ''}
                    onChange={(e) => setFloor(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wählen...</option>
                    {FLOOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Class */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Größe
                  </label>
                  <select
                    value={sizeClass}
                    onChange={(e) => setSizeClass(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wählen...</option>
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit Type */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Typ
                </label>
                <div className="flex gap-4">
                  {UNIT_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="unitType"
                        value={opt.value}
                        checked={unitType === opt.value}
                        onChange={() => setUnitType(opt.value)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Tenant Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                Mieter
              </h3>

              {/* Vacancy toggle */}
              <div className="w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVacant}
                    onChange={(e) => setIsVacant(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Leerstand
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-7">
                  Einheit ist derzeit nicht vermietet
                </p>
              </div>

              {/* Tenant fields (shown when not vacant) */}
              {!isVacant && (
                <>
                  {/* Tenant Name */}
                  <Input
                    label="Mieter Name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                  />

                  {/* Tenant Phone */}
                  <Input
                    label="Telefon"
                    type="tel"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="z.B. +41 79 123 45 67"
                  />

                  {/* Tenant Email */}
                  <Input
                    label="E-Mail"
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    placeholder="z.B. mieter@email.ch"
                    error={errors.tenantEmail}
                  />

                  {/* Move-in Date */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Einzugsdatum
                    </label>
                    <input
                      type="date"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
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
