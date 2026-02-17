'use client'

/**
 * Profile Form Component
 *
 * Form for editing tenant profile information.
 * Phone and emergency contact are editable.
 * Email, name, and unit are read-only.
 *
 * Validation on blur + on submit with German error messages.
 *
 * Phase 29: Tenant Extras & UX Improvements
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// =============================================
// TYPES
// =============================================

interface ProfileData {
  id: string
  email: string
  display_name: string
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  unit: {
    id: string
    name: string
    building_name: string | null
  } | null
}

interface ProfileFormProps {
  initialData: ProfileData
  onSave: (data: {
    phone: string
    emergency_contact_name: string
    emergency_contact_phone: string
  }) => Promise<void>
}

interface FormErrors {
  phone?: string
  emergency_contact_phone?: string
}

// Phone validation regex - allows numbers, spaces, plus, parentheses, hyphens
const PHONE_REGEX = /^[0-9+ ()-]+$/

// =============================================
// COMPONENT
// =============================================

export function ProfileForm({ initialData, onSave }: ProfileFormProps) {
  const [phone, setPhone] = useState(initialData.phone || '')
  const [emergencyName, setEmergencyName] = useState(
    initialData.emergency_contact_name || ''
  )
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialData.emergency_contact_phone || ''
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  // Validate phone number format
  const validatePhone = useCallback((value: string, fieldName: string): string | undefined => {
    if (!value || value.trim() === '') {
      if (fieldName === 'phone') {
        return 'Telefonnummer ist erforderlich'
      }
      return undefined // Emergency phone is optional
    }

    if (!PHONE_REGEX.test(value)) {
      return 'Ungültige Telefonnummer'
    }

    return undefined
  }, [])

  // Handle blur validation
  function handlePhoneBlur() {
    const error = validatePhone(phone, 'phone')
    setErrors((prev) => ({ ...prev, phone: error }))
  }

  function handleEmergencyPhoneBlur() {
    const error = validatePhone(emergencyPhone, 'emergency_contact_phone')
    setErrors((prev) => ({ ...prev, emergency_contact_phone: error }))
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate all fields
    const phoneError = validatePhone(phone, 'phone')
    const emergencyPhoneError = validatePhone(emergencyPhone, 'emergency_contact_phone')

    const newErrors: FormErrors = {}
    if (phoneError) newErrors.phone = phoneError
    if (emergencyPhoneError) newErrors.emergency_contact_phone = emergencyPhoneError

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    setSaving(true)
    try {
      await onSave({
        phone: phone.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Read-only information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Kontoinformationen
        </h2>

        {/* Email - Read only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-Mail
          </label>
          <div className="h-12 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
            {initialData.email}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Die E-Mail-Adresse kann nicht geaendert werden
          </p>
        </div>

        {/* Name - Read only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <div className="h-12 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
            {initialData.display_name}
          </div>
        </div>

        {/* Unit - Read only */}
        {initialData.unit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Einheit
            </label>
            <div className="h-12 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
              {initialData.unit.building_name
                ? `${initialData.unit.building_name} - ${initialData.unit.name}`
                : initialData.unit.name}
            </div>
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Kontaktdaten
        </h2>

        {/* Phone - Editable */}
        <Input
          label="Telefonnummer *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          error={errors.phone}
          placeholder="+41 XX XXX XX XX"
        />

        {/* Emergency Contact Name - Editable */}
        <Input
          label="Notfallkontakt Name"
          type="text"
          value={emergencyName}
          onChange={(e) => setEmergencyName(e.target.value)}
          placeholder="z.B. Partner, Nachbar, Verwandte"
        />

        {/* Emergency Contact Phone - Editable */}
        <Input
          label="Notfallkontakt Telefon"
          type="tel"
          value={emergencyPhone}
          onChange={(e) => setEmergencyPhone(e.target.value)}
          onBlur={handleEmergencyPhoneBlur}
          error={errors.emergency_contact_phone}
          placeholder="+41 XX XXX XX XX"
        />
      </div>

      {/* Submit button */}
      <Button type="submit" fullWidth loading={saving}>
        Speichern
      </Button>
    </form>
  )
}
