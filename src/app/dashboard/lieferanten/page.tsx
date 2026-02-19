'use client'

/**
 * Supplier List Page
 *
 * Displays all suppliers with inline creation form.
 *
 * Path: /dashboard/lieferanten
 * Phase 19-03: Supplier Dashboard (SUPP-01)
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Supplier {
  id: string
  partner_type: 'supplier'
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  order_count?: number
}

/**
 * Skeleton row for loading state
 */
function SupplierRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
      </td>
    </tr>
  )
}

/**
 * Inline supplier creation form
 */
function SupplierForm({
  onSave,
  onCancel,
}: {
  onSave: () => void
  onCancel: () => void
}) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!companyName.trim()) {
      setError('Firmenname ist erforderlich')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_type: 'supplier',
          company_name: companyName.trim(),
          contact_name: contactName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          is_active: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Neuer Lieferant
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Firmenname *
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="z.B. Pellets AG"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kontaktperson
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="z.B. Hans Muster"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-Mail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@beispiel.ch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+41 44 123 45 67"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Strasse, PLZ Ort"
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Wird erstellt...' : 'Lieferant erstellen'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function LieferantenPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch suppliers
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          type: 'supplier',
          limit: '200',
        })
        if (!showInactive) {
          params.set('is_active', 'true')
        }

        const response = await fetch(`/api/partners?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Lieferanten')
        }

        const data = await response.json()
        const partnerList = data.partners || []

        // Fetch order counts for each supplier
        const suppliersWithCounts = await Promise.all(
          partnerList.map(async (supplier: Supplier) => {
            try {
              const ordersResponse = await fetch(
                `/api/purchase-orders?supplier_id=${supplier.id}&limit=1`
              )
              if (ordersResponse.ok) {
                const ordersData = await ordersResponse.json()
                return { ...supplier, order_count: ordersData.total }
              }
            } catch {
              // Ignore errors
            }
            return { ...supplier, order_count: 0 }
          })
        )

        setSuppliers(suppliersWithCounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchSuppliers()
  }, [showInactive, refreshKey])

  function handleSupplierCreated() {
    setShowForm(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      <DashboardBreadcrumbs />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Lieferanten
          </h1>
          <div className="flex gap-2">
            <Link href="/dashboard/lieferanten/bestellungen">
              <Button variant="secondary">Bestellungen</Button>
            </Link>
            <Button onClick={() => setShowForm(true)}>Neuer Lieferant</Button>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Lieferanten und deren Bestellhistorie verwalten
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
          />
          Inaktive anzeigen
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Supplier Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Firma
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kontakt
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bestellungen
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SupplierRowSkeleton />
                  <SupplierRowSkeleton />
                  <SupplierRowSkeleton />
                  <SupplierRowSkeleton />
                  <SupplierRowSkeleton />
                </>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Keine Lieferanten gefunden
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/lieferanten/${supplier.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {supplier.company_name}
                      </Link>
                      {!supplier.is_active && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                          inaktiv
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {supplier.contact_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {supplier.email ? (
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {supplier.email}
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {supplier.phone ? (
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {supplier.order_count ?? 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {suppliers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            {suppliers.length} Lieferant{suppliers.length !== 1 ? 'en' : ''}
          </div>
        )}
      </Card>

      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierForm
          onSave={handleSupplierCreated}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
