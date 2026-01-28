'use client'

/**
 * ChangeOrderForm Component
 *
 * Form for creating and editing change orders.
 * Supports work order selection, line items, reason categories, and schedule impact.
 *
 * Phase 21-02: Approval Workflow
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LineItemEditor } from './LineItemEditor'
import type { ChangeOrder, ChangeOrderLineItem, ChangeOrderReason } from '@/types/change-orders'
import {
  createEmptyLineItem,
  calculateLineItemsTotal,
} from '@/lib/change-orders/queries'
import { CHANGE_ORDER_REASON_OPTIONS } from '@/lib/change-orders/workflow'

interface WorkOrder {
  id: string
  wo_number: string
  title: string
}

interface ChangeOrderFormProps {
  changeOrder?: ChangeOrder
  onSubmit: (data: FormData, isDraft: boolean) => Promise<void>
  onCancel: () => void
}

interface FormData {
  work_order_id: string
  description: string
  reason_category: ChangeOrderReason
  reason_details: string
  line_items: ChangeOrderLineItem[]
  schedule_impact_days: number
  show_line_items_to_client: boolean
}

export function ChangeOrderForm({
  changeOrder,
  onSubmit,
  onCancel,
}: ChangeOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    work_order_id: changeOrder?.work_order_id ?? '',
    description: changeOrder?.description ?? '',
    reason_category: changeOrder?.reason_category ?? 'owner_request',
    reason_details: changeOrder?.reason_details ?? '',
    line_items: changeOrder?.line_items ?? [createEmptyLineItem()],
    schedule_impact_days: changeOrder?.schedule_impact_days ?? 0,
    show_line_items_to_client: changeOrder?.show_line_items_to_client ?? true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch work orders for selection
  useEffect(() => {
    async function fetchWorkOrders() {
      try {
        setLoadingWorkOrders(true)
        const res = await fetch('/api/work-orders?limit=1000')
        if (!res.ok) throw new Error('Failed to fetch work orders')
        const data = await res.json()
        setWorkOrders(data.work_orders ?? [])
      } catch (error) {
        console.error('Error fetching work orders:', error)
      } finally {
        setLoadingWorkOrders(false)
      }
    }
    fetchWorkOrders()
  }, [])

  const handleSubmit = async (isDraft: boolean) => {
    // Validate
    const newErrors: Record<string, string> = {}

    if (!formData.work_order_id) {
      newErrors.work_order_id = 'Arbeitsauftrag ist erforderlich'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Beschreibung ist erforderlich'
    }
    if (formData.line_items.length === 0) {
      newErrors.line_items = 'Mindestens eine Position ist erforderlich'
    }
    if (formData.line_items.some((item) => !item.description.trim())) {
      newErrors.line_items = 'Alle Positionen müssen eine Beschreibung haben'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      await onSubmit(formData, isDraft)
    } catch (error) {
      console.error('Error submitting change order:', error)
    } finally {
      setLoading(false)
    }
  }

  const total = calculateLineItemsTotal(formData.line_items)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Work Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Arbeitsauftrag <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.work_order_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, work_order_id: e.target.value }))
              }
              disabled={loadingWorkOrders || !!changeOrder}
              className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Arbeitsauftrag wählen --</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.wo_number} - {wo.title}
                </option>
              ))}
            </select>
            {errors.work_order_id && (
              <p className="mt-1 text-sm text-red-600">{errors.work_order_id}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Beschreibung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              placeholder="Beschreibung der Änderung..."
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Reason Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Grund <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.reason_category}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reason_category: e.target.value as ChangeOrderReason,
                }))
              }
              className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CHANGE_ORDER_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detaillierte Begründung
            </label>
            <textarea
              value={formData.reason_details}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason_details: e.target.value }))
              }
              rows={3}
              placeholder="Optional: Weitere Details zur Begründung..."
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Schedule Impact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zeitplan-Auswirkung (Tage)
            </label>
            <input
              type="number"
              value={formData.schedule_impact_days}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  schedule_impact_days: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Positive Werte = Verzögerung, negative Werte = Beschleunigung
            </p>
          </div>

          {/* Show Line Items to Client */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-line-items"
              checked={formData.show_line_items_to_client}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  show_line_items_to_client: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="show-line-items"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Positionen dem Kunden anzeigen
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Positionen
          </h3>
          <LineItemEditor
            items={formData.line_items}
            onChange={(items) => setFormData((prev) => ({ ...prev, line_items: items }))}
          />
          {errors.line_items && (
            <p className="mt-2 text-sm text-red-600">{errors.line_items}</p>
          )}
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Gesamtbetrag
            </span>
            <span
              className={`text-2xl font-bold ${
                total < 0
                  ? 'text-red-600 dark:text-red-400'
                  : total > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {total < 0 ? '' : '+'}
              {new Intl.NumberFormat('de-CH', {
                style: 'currency',
                currency: 'CHF',
              }).format(total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Speichern...' : 'Entwurf speichern'}
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          {loading ? 'Einreichen...' : 'Einreichen'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={loading}
          variant="ghost"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
