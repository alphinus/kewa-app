'use client'

/**
 * InvoiceForm Component
 *
 * Form for creating invoices from completed work orders.
 * Supports pre-fill from work order selection.
 *
 * Phase 12.2-01: Invoice Creation Form
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DEFAULT_TAX_RATE, formatCHF, formatSwissDate } from '@/lib/costs/invoice-constants'
import type { Invoice, InvoiceLineItem } from '@/types/database'

// ============================================
// TYPES
// ============================================

interface WorkOrder {
  id: string
  title: string
  description: string | null
  status: string
  estimated_cost: number | null
  proposed_cost: number | null
  final_cost: number | null
  partner: {
    id: string
    company_name: string
  } | null
  renovation_project_id: string | null
}

interface InvoiceFormProps {
  /** Pre-select work order */
  workOrderId?: string
  /** Callback after successful save */
  onSuccess?: (invoice: Invoice) => void
  /** Callback on cancel */
  onCancel?: () => void
}

// ============================================
// HELPERS
// ============================================

function generateLineItemId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================
// COMPONENT
// ============================================

export function InvoiceForm({
  workOrderId: initialWorkOrderId,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const router = useRouter()

  // Work order selection
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(initialWorkOrderId ?? '')
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true)

  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayDateString())
  const [dueDate, setDueDate] = useState('')

  // Amount fields
  const [amountSource, setAmountSource] = useState<'estimated' | 'proposed' | 'manual'>('estimated')
  const [netAmount, setNetAmount] = useState('')
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE.toString())

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])

  // Document upload
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentPath, setDocumentPath] = useState('')
  const [uploadingDocument, setUploadingDocument] = useState(false)

  // Preview mode
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculated values
  const netAmountNum = parseFloat(netAmount) || 0
  const taxRateNum = parseFloat(taxRate) || DEFAULT_TAX_RATE
  const taxAmount = netAmountNum * (taxRateNum / 100)
  const totalAmount = netAmountNum + taxAmount

  // ============================================
  // FETCH ELIGIBLE WORK ORDERS
  // ============================================

  useEffect(() => {
    async function fetchWorkOrders() {
      try {
        setLoadingWorkOrders(true)
        // Fetch work orders with status done/accepted that don't have invoices
        const response = await fetch('/api/work-orders?status=done,accepted')
        if (!response.ok) {
          throw new Error('Failed to fetch work orders')
        }
        const data = await response.json()

        // Filter out work orders that already have invoices
        const eligibleWorkOrders = (data.workOrders || []).filter(
          (wo: WorkOrder & { invoice?: { id: string } | null }) => !wo.invoice
        )

        setWorkOrders(eligibleWorkOrders)

        // If initial work order ID is set, select it
        if (initialWorkOrderId) {
          const wo = eligibleWorkOrders.find((w: WorkOrder) => w.id === initialWorkOrderId)
          if (wo) {
            handleWorkOrderSelect(wo)
          }
        }
      } catch (err) {
        console.error('Error fetching work orders:', err)
        setError('Arbeitsauftraege konnten nicht geladen werden')
      } finally {
        setLoadingWorkOrders(false)
      }
    }

    fetchWorkOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkOrderId])

  // ============================================
  // WORK ORDER SELECTION
  // ============================================

  const handleWorkOrderSelect = useCallback((workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder)
    setSelectedWorkOrderId(workOrder.id)

    // Pre-fill from work order
    setTitle(workOrder.title || '')
    setDescription(workOrder.description || '')

    // Determine best amount source
    if (workOrder.proposed_cost !== null) {
      setAmountSource('proposed')
      setNetAmount(workOrder.proposed_cost.toString())
    } else if (workOrder.estimated_cost !== null) {
      setAmountSource('estimated')
      setNetAmount(workOrder.estimated_cost.toString())
    } else {
      setAmountSource('manual')
      setNetAmount('')
    }

    // Create default line item
    const defaultLineItem: InvoiceLineItem = {
      id: generateLineItemId(),
      description: workOrder.title || 'Arbeitsauftrag',
      quantity: 1,
      unit_price: workOrder.proposed_cost ?? workOrder.estimated_cost ?? 0,
      total: workOrder.proposed_cost ?? workOrder.estimated_cost ?? 0,
    }
    setLineItems([defaultLineItem])
  }, [])

  const handleWorkOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const workOrderId = e.target.value
    setSelectedWorkOrderId(workOrderId)

    if (!workOrderId) {
      setSelectedWorkOrder(null)
      setTitle('')
      setDescription('')
      setNetAmount('')
      setLineItems([])
      return
    }

    const wo = workOrders.find(w => w.id === workOrderId)
    if (wo) {
      handleWorkOrderSelect(wo)
    }
  }

  // ============================================
  // AMOUNT SOURCE HANDLING
  // ============================================

  const handleAmountSourceChange = (source: 'estimated' | 'proposed' | 'manual') => {
    setAmountSource(source)
    if (!selectedWorkOrder) return

    if (source === 'estimated' && selectedWorkOrder.estimated_cost !== null) {
      setNetAmount(selectedWorkOrder.estimated_cost.toString())
      updateLineItemTotal(selectedWorkOrder.estimated_cost)
    } else if (source === 'proposed' && selectedWorkOrder.proposed_cost !== null) {
      setNetAmount(selectedWorkOrder.proposed_cost.toString())
      updateLineItemTotal(selectedWorkOrder.proposed_cost)
    }
  }

  const updateLineItemTotal = (amount: number) => {
    if (lineItems.length === 1) {
      setLineItems([{
        ...lineItems[0],
        unit_price: amount,
        total: amount,
      }])
    }
  }

  // ============================================
  // LINE ITEMS
  // ============================================

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: generateLineItemId(),
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ])
  }

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item

        const updated = { ...item, [field]: value }

        // Recalculate total if quantity or unit_price changed
        if (field === 'quantity' || field === 'unit_price') {
          const qty = field === 'quantity' ? Number(value) : item.quantity
          const price = field === 'unit_price' ? Number(value) : item.unit_price
          updated.total = qty * price
        }

        return updated
      })
    )
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return
    setLineItems(items => items.filter(item => item.id !== id))
  }

  // Sync net amount from line items
  useEffect(() => {
    if (lineItems.length > 0) {
      const sum = lineItems.reduce((acc, item) => acc + item.total, 0)
      setNetAmount(sum.toString())
    }
  }, [lineItems])

  // ============================================
  // DOCUMENT UPLOAD
  // ============================================

  async function uploadDocument(file: File): Promise<string | null> {
    setUploadingDocument(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen')
      }

      const data = await response.json()
      return data.path || data.storagePath || null
    } catch (err) {
      console.error('Document upload error:', err)
      return null
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('Nur PDF oder Bilder (JPEG, PNG, WebP) erlaubt')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Datei ist zu gross (max. 10MB)')
        return
      }

      setDocumentFile(file)
      setError(null)
    }
  }

  // ============================================
  // FORM SUBMISSION
  // ============================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate required fields
      if (!selectedWorkOrderId) {
        throw new Error('Bitte waehlen Sie einen Arbeitsauftrag aus')
      }
      if (!invoiceNumber.trim()) {
        throw new Error('Rechnungsnummer ist erforderlich')
      }
      if (netAmountNum <= 0) {
        throw new Error('Bitte geben Sie einen gueltigen Betrag ein')
      }
      if (!invoiceDate) {
        throw new Error('Rechnungsdatum ist erforderlich')
      }

      // Upload document if provided
      let finalDocumentPath = documentPath
      if (documentFile) {
        const uploadedPath = await uploadDocument(documentFile)
        if (uploadedPath) {
          finalDocumentPath = uploadedPath
        }
      }

      // Build request body
      const body = {
        partner_id: selectedWorkOrder?.partner?.id,
        work_order_id: selectedWorkOrderId,
        renovation_project_id: selectedWorkOrder?.renovation_project_id ?? null,
        invoice_number: invoiceNumber.trim(),
        title: title.trim() || null,
        description: description.trim() || null,
        amount: netAmountNum,
        tax_rate: taxRateNum,
        line_items: lineItems,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        document_storage_path: finalDocumentPath || null,
        status: 'draft',
      }

      // Create invoice
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Rechnung konnte nicht erstellt werden')
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data.invoice)
      } else {
        router.push(`/dashboard/kosten/rechnungen/${data.invoice.id}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PREVIEW CONTENT
  // ============================================

  const PreviewContent = () => (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Rechnungsvorschau
      </h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Rechnungsnummer:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{invoiceNumber || '-'}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Partner:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {selectedWorkOrder?.partner?.company_name || '-'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Rechnungsdatum:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatSwissDate(invoiceDate)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Faelligkeitsdatum:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {dueDate ? formatSwissDate(dueDate) : '-'}
          </p>
        </div>
      </div>

      {title && (
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Titel:</span>
          <p className="text-gray-900 dark:text-gray-100">{title}</p>
        </div>
      )}

      {description && (
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Beschreibung:</span>
          <p className="text-gray-900 dark:text-gray-100">{description}</p>
        </div>
      )}

      {/* Line Items Table */}
      {lineItems.length > 0 && (
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm mb-2 block">Positionen:</span>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2">Beschreibung</th>
                <th className="pb-2 text-right">Menge</th>
                <th className="pb-2 text-right">Einheitspreis</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-900 dark:text-gray-100">{item.description || '-'}</td>
                  <td className="py-2 text-right text-gray-900 dark:text-gray-100">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-900 dark:text-gray-100">{formatCHF(item.unit_price)}</td>
                  <td className="py-2 text-right text-gray-900 dark:text-gray-100">{formatCHF(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Amount Summary */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Nettobetrag:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatCHF(netAmountNum)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">MwSt ({taxRateNum}%):</span>
          <span className="text-gray-900 dark:text-gray-100">{formatCHF(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold text-lg">
          <span className="text-gray-900 dark:text-gray-100">Total:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatCHF(totalAmount)}</span>
        </div>
      </div>

      {/* Document */}
      <div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">Dokument:</span>
        <p className="text-gray-900 dark:text-gray-100">
          {documentFile ? documentFile.name : documentPath ? 'Vorhanden' : 'Kein Dokument'}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowPreview(false)}
          className="flex-1"
        >
          Bearbeiten
        </Button>
        <Button
          type="submit"
          disabled={loading || uploadingDocument}
          loading={loading || uploadingDocument}
          className="flex-1"
        >
          {loading ? 'Wird erstellt...' : 'Rechnung erstellen'}
        </Button>
      </div>
    </div>
  )

  // ============================================
  // RENDER
  // ============================================

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {showPreview ? (
        <PreviewContent />
      ) : (
        <>
          {/* Work Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arbeitsauftrag *
            </label>
            {loadingWorkOrders ? (
              <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedWorkOrderId}
                onChange={handleWorkOrderChange}
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Arbeitsauftrag waehlen...</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>
                    {wo.title} {wo.partner ? `(${wo.partner.company_name})` : ''}
                  </option>
                ))}
              </select>
            )}
            {workOrders.length === 0 && !loadingWorkOrders && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Keine berechtigten Arbeitsauftraege vorhanden (Status: done/accepted, ohne Rechnung)
              </p>
            )}
          </div>

          {/* Partner Display (readonly) */}
          {selectedWorkOrder?.partner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Partner
              </label>
              <div className="w-full h-12 px-4 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {selectedWorkOrder.partner.company_name}
              </div>
            </div>
          )}

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rechnungsnummer *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="z.B. RE-2024-001"
              required
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Rechnungstitel"
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rechnungsdatum *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Faelligkeitsdatum
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Amount Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Betrag
            </label>

            {/* Counter-offer option */}
            {selectedWorkOrder && (selectedWorkOrder.estimated_cost !== null || selectedWorkOrder.proposed_cost !== null) && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Betrag aus Arbeitsauftrag:</p>
                <div className="flex flex-wrap gap-4">
                  {selectedWorkOrder.estimated_cost !== null && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="amountSource"
                        value="estimated"
                        checked={amountSource === 'estimated'}
                        onChange={() => handleAmountSourceChange('estimated')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Offerte: {formatCHF(selectedWorkOrder.estimated_cost)}
                      </span>
                    </label>
                  )}
                  {selectedWorkOrder.proposed_cost !== null && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="amountSource"
                        value="proposed"
                        checked={amountSource === 'proposed'}
                        onChange={() => handleAmountSourceChange('proposed')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Gegenofferte: {formatCHF(selectedWorkOrder.proposed_cost)}
                      </span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amountSource"
                      value="manual"
                      checked={amountSource === 'manual'}
                      onChange={() => handleAmountSourceChange('manual')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Manuell eingeben
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Positionen</span>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + Zeile hinzufuegen
                </button>
              </div>

              {lineItems.map((item, index) => (
                <div key={item.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Position {index + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                    placeholder="Beschreibung"
                    className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Menge</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Einheitspreis</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total</label>
                      <div className="w-full h-10 px-3 flex items-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                        {formatCHF(item.total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  MwSt-Satz (%)
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  step="0.1"
                  min="0"
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  MwSt-Betrag
                </label>
                <div className="w-full h-12 px-4 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {formatCHF(taxAmount)}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCHF(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Zusaetzliche Informationen zur Rechnung..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rechnungsdokument
            </label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
                documentFile || documentPath
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              {documentFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">
                      {documentFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center py-4">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Rechnungsdokument hochladen
                    </span>
                    <span className="text-gray-400 text-sm mt-1">
                      PDF oder Bild (max. 10MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleDocumentChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Hinweis: Fuer Entwuerfe ist kein Dokument erforderlich
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={loading || uploadingDocument}
                className="flex-1"
              >
                Abbrechen
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(true)}
              disabled={loading || uploadingDocument || !selectedWorkOrderId || !invoiceNumber}
              className="flex-1"
            >
              Vorschau
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadingDocument || !selectedWorkOrderId || !invoiceNumber}
              loading={loading || uploadingDocument}
              className="flex-1"
            >
              {uploadingDocument
                ? 'Dokument wird hochgeladen...'
                : loading
                  ? 'Wird erstellt...'
                  : 'Rechnung erstellen'}
            </Button>
          </div>
        </>
      )}
    </form>
  )
}
