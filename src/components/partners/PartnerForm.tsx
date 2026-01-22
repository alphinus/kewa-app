'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Partner } from '@/types/database'
import type { PartnerType, TradeCategory } from '@/types'

// =============================================
// TYPES
// =============================================

interface PartnerFormProps {
  /** Mode: create new or edit existing */
  mode: 'create' | 'edit'
  /** Existing partner for edit mode */
  partner?: Partner
  /** Callback on successful save */
  onSave: (partner: Partner) => void
  /** Callback on cancel */
  onCancel: () => void
}

// Trade categories available for contractors
const TRADE_CATEGORIES: { value: TradeCategory; label: string }[] = [
  { value: 'general', label: 'Allgemein' },
  { value: 'plumbing', label: 'Sanitär' },
  { value: 'electrical', label: 'Elektro' },
  { value: 'hvac', label: 'Heizung/Lüftung' },
  { value: 'painting', label: 'Malerarbeiten' },
  { value: 'flooring', label: 'Bodenbeläge' },
  { value: 'carpentry', label: 'Schreinerei' },
  { value: 'roofing', label: 'Dacharbeiten' },
  { value: 'masonry', label: 'Maurerarbeiten' },
  { value: 'glazing', label: 'Glaserei' },
  { value: 'landscaping', label: 'Gartenarbeit' },
  { value: 'cleaning', label: 'Reinigung' },
  { value: 'demolition', label: 'Abbruch' },
  { value: 'other', label: 'Sonstiges' },
]

// =============================================
// COMPONENT
// =============================================

/**
 * Partner create/edit form
 *
 * Allows creating and editing partners (contractors and suppliers) with:
 * - Partner type selection (Handwerker/Lieferant)
 * - Company and contact information
 * - Email validation (required for contractors)
 * - Trade categories multi-select (contractors only)
 * - Address and notes
 * - Active status toggle (edit mode only)
 */
export function PartnerForm({
  mode,
  partner,
  onSave,
  onCancel
}: PartnerFormProps) {
  // Form state
  const [partnerType, setPartnerType] = useState<PartnerType>(partner?.partner_type || 'contractor')
  const [companyName, setCompanyName] = useState(partner?.company_name || '')
  const [contactName, setContactName] = useState(partner?.contact_name || '')
  const [email, setEmail] = useState(partner?.email || '')
  const [phone, setPhone] = useState(partner?.phone || '')
  const [address, setAddress] = useState(partner?.address || '')
  const [notes, setNotes] = useState(partner?.notes || '')
  const [isActive, setIsActive] = useState(partner?.is_active !== false)
  const [selectedTrades, setSelectedTrades] = useState<TradeCategory[]>(partner?.trade_categories || [])

  // UI state
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Validate form
   */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!companyName.trim()) {
      newErrors.companyName = 'Firmenname ist erforderlich'
    }

    // Email is required for contractors
    if (partnerType === 'contractor') {
      if (!email.trim()) {
        newErrors.email = 'E-Mail ist für Handwerker erforderlich'
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
          newErrors.email = 'Ungültiges E-Mail-Format'
        }
      }

      // Trade categories required for contractors
      if (selectedTrades.length === 0) {
        newErrors.trades = 'Bitte wählen Sie mindestens ein Gewerk aus'
      }
    } else {
      // Validate email format if provided for suppliers
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
          newErrors.email = 'Ungültiges E-Mail-Format'
        }
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
        partner_type: partnerType,
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        trade_categories: partnerType === 'contractor' ? selectedTrades : [],
        is_active: isActive,
        notes: notes.trim() || null
      }

      const url = mode === 'create'
        ? '/api/partners'
        : `/api/partners/${partner?.id}`
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
      onSave(data.partner)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Toggle trade category selection
   */
  function toggleTrade(trade: TradeCategory) {
    if (selectedTrades.includes(trade)) {
      setSelectedTrades(selectedTrades.filter(t => t !== trade))
    } else {
      setSelectedTrades([...selectedTrades, trade])
    }
  }

  /**
   * Handle partner type change - clear trades when switching to supplier
   */
  function handlePartnerTypeChange(type: PartnerType) {
    setPartnerType(type)
    if (type === 'supplier') {
      setSelectedTrades([])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <Card className="w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Neuer Partner' : 'Partner bearbeiten'}
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

            {/* Partner Type */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Partner-Typ *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="partnerType"
                    value="contractor"
                    checked={partnerType === 'contractor'}
                    onChange={() => handlePartnerTypeChange('contractor')}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Handwerker</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="partnerType"
                    value="supplier"
                    checked={partnerType === 'supplier'}
                    onChange={() => handlePartnerTypeChange('supplier')}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Lieferant</span>
                </label>
              </div>
            </div>

            {/* Company Name */}
            <Input
              label="Firmenname *"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z.B. Müller AG"
              error={errors.companyName}
              required
            />

            {/* Contact Name */}
            <Input
              label="Kontaktperson"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="z.B. Hans Müller"
            />

            {/* Email */}
            <Input
              label={partnerType === 'contractor' ? 'E-Mail *' : 'E-Mail'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="z.B. kontakt@firma.ch"
              error={errors.email}
              required={partnerType === 'contractor'}
            />

            {/* Phone */}
            <Input
              label="Telefon"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="z.B. +41 44 123 45 67"
            />

            {/* Address */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Strasse, PLZ Ort"
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Trade Categories (contractors only) */}
            {partnerType === 'contractor' && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gewerke *
                </label>
                {errors.trades && (
                  <p className="mb-2 text-sm text-red-500">{errors.trades}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {TRADE_CATEGORIES.map((trade) => (
                    <label
                      key={trade.value}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTrades.includes(trade.value)}
                        onChange={() => toggleTrade(trade.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {trade.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notizen
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusätzliche Informationen..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Active Status (edit mode only) */}
            {mode === 'edit' && (
              <div className="w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Partner ist aktiv
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Inaktive Partner werden nicht in Dropdown-Listen angezeigt
                </p>
              </div>
            )}
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
