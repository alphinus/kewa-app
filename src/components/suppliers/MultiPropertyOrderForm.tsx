/**
 * Multi-Property Purchase Order Allocation Form
 *
 * Form for distributing a purchase order across multiple properties.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, X } from 'lucide-react'
import type { Property } from '@/types/database'
import type { PurchaseOrderAllocation } from '@/types/suppliers'

interface AllocationRow {
  id: string
  property_id: string
  building_id?: string
  allocated_quantity: number
  allocated_amount: number
  notes?: string
}

interface MultiPropertyOrderFormProps {
  purchaseOrderId: string
  totalQuantity: number
  totalAmount: number
  properties: Property[]
  onSuccess?: () => void
}

export function MultiPropertyOrderForm({
  purchaseOrderId,
  totalQuantity,
  totalAmount,
  properties,
  onSuccess,
}: MultiPropertyOrderFormProps) {
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [existingAllocations, setExistingAllocations] = useState<PurchaseOrderAllocation[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingExisting, setFetchingExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate unit price
  const unitPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0

  // Fetch existing allocations on mount
  useEffect(() => {
    async function fetchExisting() {
      try {
        const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/allocations`)
        if (!response.ok) throw new Error('Failed to fetch existing allocations')
        const data = await response.json()
        setExistingAllocations(data.allocations || [])
      } catch (err) {
        console.error('Error fetching existing allocations:', err)
      } finally {
        setFetchingExisting(false)
      }
    }
    fetchExisting()
  }, [purchaseOrderId])

  // Calculate totals
  const allocatedQuantity = allocations.reduce((sum, a) => sum + a.allocated_quantity, 0)
  const allocatedAmount = allocations.reduce((sum, a) => sum + a.allocated_amount, 0)
  const existingQuantity = existingAllocations.reduce((sum, a) => sum + a.allocated_quantity, 0)
  const existingAmount = existingAllocations.reduce((sum, a) => sum + a.allocated_amount, 0)

  const totalAllocatedQuantity = allocatedQuantity + existingQuantity
  const totalAllocatedAmount = allocatedAmount + existingAmount

  const remainingQuantity = totalQuantity - totalAllocatedQuantity
  const remainingAmount = totalAmount - totalAllocatedAmount

  const isOverAllocated = remainingAmount < 0 || remainingQuantity < 0

  // Add new allocation row
  const addAllocation = () => {
    setAllocations([
      ...allocations,
      {
        id: `new-${Date.now()}`,
        property_id: '',
        allocated_quantity: 0,
        allocated_amount: 0,
      },
    ])
  }

  // Remove allocation row
  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter((a) => a.id !== id))
  }

  // Update allocation row
  const updateAllocation = (id: string, field: keyof AllocationRow, value: any) => {
    setAllocations(
      allocations.map((a) => {
        if (a.id !== id) return a

        const updated = { ...a, [field]: value }

        // Auto-calculate amount when quantity changes
        if (field === 'allocated_quantity') {
          updated.allocated_amount = value * unitPrice
        }

        return updated
      })
    )
  }

  // Save allocations
  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      // Validate at least one allocation
      if (allocations.length === 0) {
        throw new Error('Mindestens eine Liegenschaft muss hinzugefuegt werden')
      }

      // Validate all allocations have property selected
      if (allocations.some((a) => !a.property_id)) {
        throw new Error('Alle Liegenschaften muessen ausgewaehlt werden')
      }

      // Save each allocation
      for (const allocation of allocations) {
        const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/allocations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: allocation.property_id,
            building_id: allocation.building_id || null,
            allocated_quantity: allocation.allocated_quantity,
            allocated_amount: allocation.allocated_amount,
            notes: allocation.notes || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create allocation')
        }
      }

      // Clear form and trigger success callback
      setAllocations([])
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingExisting) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Verteilung auf Liegenschaften</h3>
        <p className="text-sm text-gray-600">
          Verteilen Sie die Bestellung auf mehrere Liegenschaften. Der Gesamtbetrag darf{' '}
          <span className="font-semibold">CHF {totalAmount.toFixed(2)}</span> nicht ueberschreiten.
        </p>
      </div>

      {/* Existing allocations */}
      {existingAllocations.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3">Bestehende Verteilungen</h4>
          <div className="space-y-2">
            {existingAllocations.map((allocation) => (
              <div key={allocation.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {allocation.property?.name || 'Unbekannte Liegenschaft'}
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {allocation.allocated_quantity.toFixed(2)} t
                  </div>
                  <div className="text-gray-600">
                    CHF {allocation.allocated_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New allocation rows */}
      {allocations.map((allocation, index) => (
        <div
          key={allocation.id}
          className="border border-gray-200 rounded-lg p-4 space-y-4"
        >
          <div className="flex items-start justify-between">
            <Label className="text-sm font-medium">Verteilung {index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAllocation(allocation.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`property-${allocation.id}`}>Liegenschaft</Label>
              <Select
                value={allocation.property_id}
                onValueChange={(value) => updateAllocation(allocation.id, 'property_id', value)}
              >
                <SelectTrigger id={`property-${allocation.id}`}>
                  <SelectValue placeholder="Liegenschaft waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={`quantity-${allocation.id}`}>Menge (Tonnen)</Label>
              <Input
                id={`quantity-${allocation.id}`}
                type="number"
                step="0.01"
                min="0"
                value={allocation.allocated_quantity}
                onChange={(e) =>
                  updateAllocation(allocation.id, 'allocated_quantity', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`amount-${allocation.id}`}>Betrag (CHF)</Label>
            <Input
              id={`amount-${allocation.id}`}
              type="number"
              step="0.01"
              min="0"
              value={allocation.allocated_amount.toFixed(2)}
              onChange={(e) =>
                updateAllocation(allocation.id, 'allocated_amount', parseFloat(e.target.value) || 0)
              }
            />
          </div>

          <div>
            <Label htmlFor={`notes-${allocation.id}`}>Notizen (optional)</Label>
            <Input
              id={`notes-${allocation.id}`}
              value={allocation.notes || ''}
              onChange={(e) => updateAllocation(allocation.id, 'notes', e.target.value)}
              placeholder="Zusaetzliche Informationen..."
            />
          </div>
        </div>
      ))}

      {/* Add allocation button */}
      <Button type="button" variant="outline" onClick={addAllocation}>
        <Plus className="h-4 w-4 mr-2" />
        Liegenschaft hinzufuegen
      </Button>

      {/* Summary section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm text-blue-900">Zusammenfassung</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Gesamt verfuegbar:</div>
            <div className="font-semibold">
              {totalQuantity.toFixed(2)} t / CHF {totalAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Bereits verteilt:</div>
            <div className="font-semibold">
              {existingQuantity.toFixed(2)} t / CHF {existingAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Neue Verteilung:</div>
            <div className="font-semibold">
              {allocatedQuantity.toFixed(2)} t / CHF {allocatedAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Verbleibend:</div>
            <div className={`font-semibold ${isOverAllocated ? 'text-red-600' : 'text-green-600'}`}>
              {remainingQuantity.toFixed(2)} t / CHF {remainingAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Over-allocation warning */}
      {isOverAllocated && (
        <Alert variant="destructive">
          <AlertDescription>
            Die Gesamtverteilung ueberschreitet die verfuegbare Menge oder den Betrag.
          </AlertDescription>
        </Alert>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading || isOverAllocated || allocations.length === 0}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verteilungen speichern
        </Button>
      </div>
    </div>
  )
}
