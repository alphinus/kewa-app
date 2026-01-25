'use client'

/**
 * PurchaseOrderForm Component
 *
 * Form for creating and editing purchase orders with line items.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineItemEditor } from './LineItemEditor'
import {
  type PurchaseOrderLineItem,
  createEmptyLineItem,
  calculateLineItemsTotal,
  formatCHF,
} from '@/lib/suppliers/purchase-order-queries'

interface Supplier {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

interface PurchaseOrderFormProps {
  /** Pre-select supplier by ID */
  supplierId?: string
  /** Callback after successful save */
  onSave: (purchaseOrder: PurchaseOrderData) => void
  /** Callback on cancel */
  onCancel: () => void
}

interface PurchaseOrderData {
  id: string
  order_number: string
  supplier_id: string
  status: string
  total_amount: number
  [key: string]: unknown
}

export function PurchaseOrderForm({
  supplierId: initialSupplierId,
  onSave,
  onCancel,
}: PurchaseOrderFormProps) {
  // Suppliers list
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  // Form fields
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? '')
  const [lineItems, setLineItems] = useState<PurchaseOrderLineItem[]>([
    createEmptyLineItem(),
  ])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculated total
  const totalAmount = calculateLineItemsTotal(lineItems)

  // Fetch suppliers
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        setLoadingSuppliers(true)
        const response = await fetch('/api/partners?type=supplier&is_active=true')
        if (!response.ok) {
          throw new Error('Failed to fetch suppliers')
        }
        const data = await response.json()
        setSuppliers(data.partners || [])

        // If initial supplier provided, verify it exists
        if (initialSupplierId) {
          const exists = (data.partners || []).some(
            (s: Supplier) => s.id === initialSupplierId
          )
          if (!exists) {
            setSupplierId('')
          }
        }
      } catch (err) {
        console.error('Error fetching suppliers:', err)
        setError('Lieferanten konnten nicht geladen werden')
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [initialSupplierId])

  // Validate form
  const validateForm = useCallback((): string | null => {
    if (!supplierId) {
      return 'Bitte waehlen Sie einen Lieferanten aus'
    }

    if (lineItems.length === 0) {
      return 'Mindestens eine Position ist erforderlich'
    }

    const hasEmptyDescription = lineItems.some(
      (item) => !item.description.trim()
    )
    if (hasEmptyDescription) {
      return 'Alle Positionen muessen eine Beschreibung haben'
    }

    const hasInvalidQuantity = lineItems.some((item) => item.quantity <= 0)
    if (hasInvalidQuantity) {
      return 'Alle Positionen muessen eine gueltige Menge haben'
    }

    const hasInvalidPrice = lineItems.some((item) => item.unit_price < 0)
    if (hasInvalidPrice) {
      return 'Stueckpreise duerfen nicht negativ sein'
    }

    return null
  }, [supplierId, lineItems])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const body = {
        supplier_id: supplierId,
        line_items: lineItems,
        expected_delivery_date: expectedDeliveryDate || null,
        notes: notes.trim() || null,
        status: 'draft',
      }

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Bestellung konnte nicht erstellt werden')
      }

      const data = await response.json()
      onSave(data.purchase_order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Neue Bestellung
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Erstellen Sie eine neue Bestellung fuer einen Lieferanten
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lieferant *
            </label>
            {loadingSuppliers ? (
              <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ) : (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Lieferant waehlen...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                    {supplier.contact_name && ` (${supplier.contact_name})`}
                  </option>
                ))}
              </select>
            )}
            {suppliers.length === 0 && !loadingSuppliers && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Keine aktiven Lieferanten vorhanden. Bitte erstellen Sie zuerst
                einen Lieferanten.
              </p>
            )}
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Erwartetes Lieferdatum
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Line Items */}
          <LineItemEditor items={lineItems} onChange={setLineItems} />

          {/* Total Amount */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Gesamtbetrag
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCHF(totalAmount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bemerkungen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusaetzliche Informationen zur Bestellung..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={loading || suppliers.length === 0}
            loading={loading}
            className="flex-1"
          >
            {loading ? 'Wird erstellt...' : 'Bestellung erstellen'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
