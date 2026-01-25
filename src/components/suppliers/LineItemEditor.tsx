'use client'

/**
 * LineItemEditor Component
 *
 * Reusable line item editor for purchase orders.
 * Supports add, edit, remove operations with auto-calculated totals.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { useCallback } from 'react'
import {
  type PurchaseOrderLineItem,
  createEmptyLineItem,
  updateLineItem,
  formatCHF,
  DEFAULT_UNITS,
} from '@/lib/suppliers/purchase-order-queries'

interface LineItemEditorProps {
  items: PurchaseOrderLineItem[]
  onChange: (items: PurchaseOrderLineItem[]) => void
  readOnly?: boolean
}

export function LineItemEditor({
  items,
  onChange,
  readOnly = false,
}: LineItemEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([...items, createEmptyLineItem()])
  }, [items, onChange])

  const handleRemove = useCallback(
    (id: string) => {
      if (items.length <= 1) return
      onChange(items.filter((item) => item.id !== id))
    },
    [items, onChange]
  )

  const handleUpdate = useCallback(
    (id: string, field: keyof Omit<PurchaseOrderLineItem, 'id' | 'total'>, value: string | number) => {
      onChange(
        items.map((item) => {
          if (item.id !== id) return item
          return updateLineItem(item, { [field]: value })
        })
      )
    },
    [items, onChange]
  )

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Positionen ({items.length})
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAdd}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            + Position hinzufuegen
          </button>
        )}
      </div>

      {/* Line Items */}
      {items.map((item, index) => (
        <div
          key={item.id}
          className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
        >
          {/* Item Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Position {index + 1}
            </span>
            {!readOnly && items.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Entfernen
              </button>
            )}
          </div>

          {/* Description */}
          <input
            type="text"
            value={item.description}
            onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
            placeholder="Beschreibung"
            disabled={readOnly}
            className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />

          {/* Quantity, Unit, Price, Total */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Quantity */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Menge
              </label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleUpdate(item.id, 'quantity', parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
                disabled={readOnly}
                className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Einheit
              </label>
              <select
                value={item.unit}
                onChange={(e) => handleUpdate(item.id, 'unit', e.target.value)}
                disabled={readOnly}
                className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                {DEFAULT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Stueckpreis
              </label>
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) =>
                  handleUpdate(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
                disabled={readOnly}
                className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Total (calculated, readonly) */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Total
              </label>
              <div className="w-full h-10 px-3 flex items-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium">
                {formatCHF(item.total)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          Keine Positionen vorhanden.{' '}
          {!readOnly && (
            <button
              type="button"
              onClick={handleAdd}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Position hinzufuegen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
