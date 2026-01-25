'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PartnerType } from '@/types'

interface PartnerStepProps {
  initialData?: { id: string; name: string }
  onComplete: (data: { id: string; name: string }) => void
  onBack: () => void
}

/**
 * Partner creation step for setup wizard (simplified)
 */
export function PartnerStep({ initialData, onComplete, onBack }: PartnerStepProps) {
  const [companyName, setCompanyName] = useState(initialData?.name || '')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [partnerType, setPartnerType] = useState<PartnerType>('contractor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!companyName.trim()) {
      setError('Firmenname ist erforderlich')
      return
    }

    // Email required for contractors
    if (partnerType === 'contractor' && !email.trim()) {
      setError('E-Mail ist für Handwerker erforderlich')
      return
    }

    // Validate email format if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        setError('Ungültiges E-Mail-Format')
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_name: contactName.trim() || null,
          email: email.trim() || null,
          partner_type: partnerType,
          is_active: true,
          trade_categories: partnerType === 'contractor' ? ['general'] : [],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const { partner } = await response.json()
      onComplete({ id: partner.id, name: partner.company_name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Partnertyp
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="partnerType"
              value="contractor"
              checked={partnerType === 'contractor'}
              onChange={() => setPartnerType('contractor')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Handwerker</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="partnerType"
              value="supplier"
              checked={partnerType === 'supplier'}
              onChange={() => setPartnerType('supplier')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Lieferant</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Firmenname *
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="z.B. Müller Sanitär AG"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Kontaktperson
        </label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="z.B. Hans Müller"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          E-Mail {partnerType === 'contractor' && '*'}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kontakt@firma.ch"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required={partnerType === 'contractor'}
        />
        {partnerType === 'contractor' && (
          <p className="text-xs text-gray-500 mt-1">
            E-Mail wird für Arbeitsaufträge benötigt
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" fullWidth onClick={onBack} disabled={loading}>
          Zurück
        </Button>
        <Button type="submit" fullWidth loading={loading}>
          Fertigstellen
        </Button>
      </div>
    </form>
  )
}
