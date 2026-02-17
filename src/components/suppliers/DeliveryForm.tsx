'use client'

/**
 * DeliveryForm Component
 *
 * Dialog form for recording deliveries with property association.
 *
 * Phase 19-03: Delivery Recording (SUPP-04, SUPP-05)
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import type { PurchaseOrder, CreateDeliveryInput } from '@/types/suppliers'
import { formatCHF, DEFAULT_UNITS } from '@/lib/suppliers/purchase-order-queries'

interface Property {
  id: string
  name: string
}

interface Building {
  id: string
  name: string
  property_id: string
}

interface DeliveryFormProps {
  /** Purchase order to record delivery for */
  purchaseOrder: PurchaseOrder
  /** Callback after successful save */
  onSave: (delivery: CreateDeliveryInput) => Promise<void>
  /** Callback on cancel */
  onCancel: () => void
}

/**
 * Calculate total quantity from line items
 */
function calculateTotalQuantity(lineItems: PurchaseOrder['line_items']): number {
  return lineItems.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Get the primary unit from line items
 */
function getPrimaryUnit(lineItems: PurchaseOrder['line_items']): string {
  if (lineItems.length === 0) return 'Stueck'
  // Use the unit from the first line item
  return lineItems[0].unit
}

export function DeliveryForm({
  purchaseOrder,
  onSave,
  onCancel,
}: DeliveryFormProps) {
  // Properties and buildings
  const [properties, setProperties] = useState<Property[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [loadingBuildings, setLoadingBuildings] = useState(false)

  // Form fields
  const totalQuantity = calculateTotalQuantity(purchaseOrder.line_items)
  const primaryUnit = getPrimaryUnit(purchaseOrder.line_items)

  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('')
  const [quantityReceived, setQuantityReceived] = useState(totalQuantity)
  const [quantityUnit, setQuantityUnit] = useState(primaryUnit)
  const [propertyId, setPropertyId] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [varianceNote, setVarianceNote] = useState('')
  const [notes, setNotes] = useState('')

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate variance
  const hasVariance = quantityReceived !== totalQuantity
  const varianceAmount = quantityReceived - totalQuantity
  const variancePercent = totalQuantity > 0
    ? ((varianceAmount / totalQuantity) * 100).toFixed(1)
    : '0'

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoadingProperties(true)
        const response = await fetch('/api/properties')
        if (!response.ok) {
          throw new Error('Failed to fetch properties')
        }
        const data = await response.json()
        setProperties(data.properties || [])
      } catch (err) {
        console.error('Error fetching properties:', err)
        setError('Liegenschaften konnten nicht geladen werden')
      } finally {
        setLoadingProperties(false)
      }
    }

    fetchProperties()
  }, [])

  // Fetch buildings when property changes
  useEffect(() => {
    async function fetchBuildings() {
      if (!propertyId) {
        setBuildings([])
        setBuildingId('')
        return
      }

      try {
        setLoadingBuildings(true)
        const response = await fetch(`/api/buildings?property_id=${propertyId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch buildings')
        }
        const data = await response.json()
        setBuildings(data.buildings || [])
        setBuildingId('')
      } catch (err) {
        console.error('Error fetching buildings:', err)
      } finally {
        setLoadingBuildings(false)
      }
    }

    fetchBuildings()
  }, [propertyId])

  // Validate form
  const validateForm = useCallback((): string | null => {
    if (!deliveryDate) {
      return 'Lieferdatum ist erforderlich'
    }

    if (quantityReceived < 0) {
      return 'Erhaltene Menge darf nicht negativ sein'
    }

    if (!propertyId) {
      return 'Bitte wählen Sie eine Liegenschaft aus'
    }

    if (hasVariance && !varianceNote.trim()) {
      return 'Bei Abweichung ist eine Begruendung erforderlich'
    }

    return null
  }, [deliveryDate, quantityReceived, propertyId, hasVariance, varianceNote])

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
      const deliveryData: CreateDeliveryInput = {
        purchase_order_id: purchaseOrder.id,
        delivery_date: deliveryDate,
        delivery_note_number: deliveryNoteNumber.trim() || undefined,
        quantity_ordered: totalQuantity,
        quantity_received: quantityReceived,
        quantity_unit: quantityUnit,
        property_id: propertyId,
        building_id: buildingId || undefined,
        variance_note: varianceNote.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      await onSave(deliveryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Lieferung erfassen
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Bestellung {purchaseOrder.order_number}
            </p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Order summary */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Lieferant:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {purchaseOrder.supplier?.company_name ?? '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Betrag:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {formatCHF(purchaseOrder.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Bestellte Menge:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {totalQuantity} {primaryUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lieferdatum *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Delivery Note Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lieferschein-Nr.
              </label>
              <input
                type="text"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                placeholder="z.B. LS-12345"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quantity Received */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Erhaltene Menge *
                </label>
                <input
                  type="number"
                  value={quantityReceived}
                  onChange={(e) => setQuantityReceived(Number(e.target.value))}
                  min="0"
                  step="any"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Einheit
                </label>
                <select
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEFAULT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Variance Warning */}
            {hasVariance && (
              <div className={`p-3 rounded-lg ${
                varianceAmount < 0
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-5 h-5 ${varianceAmount < 0 ? 'text-red-500' : 'text-yellow-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className={`text-sm font-medium ${
                    varianceAmount < 0
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    Abweichung: {varianceAmount > 0 ? '+' : ''}{varianceAmount} ({variancePercent}%)
                  </span>
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Begruendung *
                  </label>
                  <input
                    type="text"
                    value={varianceNote}
                    onChange={(e) => setVarianceNote(e.target.value)}
                    placeholder="z.B. Teillieferung, Beschaedigung, ..."
                    required={hasVariance}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Liegenschaft *
              </label>
              {loadingProperties ? (
                <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Liegenschaft wählen...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Building Selection */}
            {propertyId && buildings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gebäude
                </label>
                {loadingBuildings ? (
                  <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                ) : (
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Kein spezifisches Gebäude</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bemerkungen
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusaetzliche Informationen zur Lieferung..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
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
              disabled={loading}
              loading={loading}
              className="flex-1"
            >
              {loading ? 'Wird gespeichert...' : 'Lieferung erfassen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
