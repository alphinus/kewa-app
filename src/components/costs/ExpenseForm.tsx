'use client'

/**
 * ExpenseForm Component
 *
 * Form for creating and editing expenses with receipt upload.
 * Supports linking to Project OR Unit (mutually exclusive in UI).
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  formatCHF,
} from '@/lib/costs/expense-constants'
import type { Expense } from '@/types/database'
import type { ExpenseCategory, ExpensePaymentMethod } from '@/types'

interface Project {
  id: string
  name: string
  unit_id: string
}

interface Unit {
  id: string
  name: string
}

interface ExpenseFormProps {
  /** Expense to edit (null for new expense) */
  expense?: Expense | null
  /** Pre-select project ID */
  projectId?: string
  /** Pre-select unit ID */
  unitId?: string
  /** Callback after successful save - receives expense data from API */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (expense: any) => void
  /** Callback on cancel */
  onCancel?: () => void
}

export function ExpenseForm({
  expense,
  projectId,
  unitId,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const router = useRouter()
  const isEditing = !!expense

  // Form state
  const [title, setTitle] = useState(expense?.title ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? 'material'
  )
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(
    expense?.payment_method ?? 'cash'
  )
  const [vendorName, setVendorName] = useState(expense?.vendor_name ?? '')
  const [receiptNumber, setReceiptNumber] = useState(expense?.receipt_number ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')

  // Entity linking
  const [linkType, setLinkType] = useState<'project' | 'unit'>(
    expense?.renovation_project_id ? 'project' : 'unit'
  )
  const [selectedProjectId, setSelectedProjectId] = useState(
    expense?.renovation_project_id ?? projectId ?? ''
  )
  const [selectedUnitId, setSelectedUnitId] = useState(
    expense?.unit_id ?? unitId ?? ''
  )

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPath, setReceiptPath] = useState(expense?.receipt_storage_path ?? '')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Data loading
  const [projects, setProjects] = useState<Project[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects and units
  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsRes, unitsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/units'),
        ])

        if (projectsRes.ok) {
          const data = await projectsRes.json()
          setProjects(data.projects || [])
        }

        if (unitsRes.ok) {
          const data = await unitsRes.json()
          setUnits(data.units || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      }
    }

    fetchData()
  }, [])

  // Upload receipt file
  async function uploadReceipt(file: File): Promise<string | null> {
    setUploadingReceipt(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Upload to storage
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
      console.error('Receipt upload error:', err)
      return null
    } finally {
      setUploadingReceipt(false)
    }
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate required fields
      if (!title.trim()) {
        throw new Error('Bezeichnung ist erforderlich')
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum < 0) {
        throw new Error('Bitte geben Sie einen gültigen Betrag ein')
      }

      // Validate entity link
      const entityProjectId = linkType === 'project' ? selectedProjectId : null
      const entityUnitId = linkType === 'unit' ? selectedUnitId : null

      if (!entityProjectId && !entityUnitId) {
        throw new Error('Bitte wählen Sie ein Projekt oder eine Einheit aus')
      }

      // Upload receipt if new file selected
      let finalReceiptPath = receiptPath
      if (receiptFile) {
        const uploadedPath = await uploadReceipt(receiptFile)
        if (!uploadedPath) {
          throw new Error('Beleg-Upload fehlgeschlagen')
        }
        finalReceiptPath = uploadedPath
      }

      // Receipt is required
      if (!finalReceiptPath) {
        throw new Error('Beleg ist erforderlich')
      }

      // Build request body
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        amount: amountNum,
        category,
        payment_method: paymentMethod,
        renovation_project_id: entityProjectId,
        unit_id: entityUnitId,
        vendor_name: vendorName.trim() || null,
        receipt_storage_path: finalReceiptPath,
        receipt_number: receiptNumber.trim() || null,
        notes: notes.trim() || null,
      }

      // Create or update
      const url = isEditing ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data.expense)
      } else {
        router.push('/dashboard/kosten/ausgaben')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  // Handle receipt file selection
  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('Nur Bilder (JPEG, PNG, WebP) oder PDF erlaubt')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Datei ist zu gross (max. 10MB)')
        return
      }

      setReceiptFile(file)
      setError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bezeichnung *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Material Baumarkt"
          required
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Betrag (CHF) *
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          required
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {amount && !isNaN(parseFloat(amount)) && (
          <p className="mt-1 text-sm text-gray-500">
            {formatCHF(parseFloat(amount))}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Kategorie *
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          required
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Zahlungsart *
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
          required
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EXPENSE_PAYMENT_METHODS.map((pm) => (
            <option key={pm.value} value={pm.value}>
              {pm.label}
            </option>
          ))}
        </select>
      </div>

      {/* Entity Link Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Zuordnung *
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="linkType"
              value="project"
              checked={linkType === 'project'}
              onChange={() => setLinkType('project')}
              className="w-5 h-5 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Projekt</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="linkType"
              value="unit"
              checked={linkType === 'unit'}
              onChange={() => setLinkType('unit')}
              className="w-5 h-5 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Einheit</span>
          </label>
        </div>

        {/* Project Select */}
        {linkType === 'project' && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Projekt wählen...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}

        {/* Unit Select */}
        {linkType === 'unit' && (
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Einheit wählen...</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Vendor Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Lieferant / Haendler
        </label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="z.B. Jumbo, Coop Bau+Hobby"
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Beleg *
        </label>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
            receiptFile || receiptPath
              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          {receiptFile ? (
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
                  {receiptFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                className="text-red-600 hover:text-red-700"
              >
                Entfernen
              </button>
            </div>
          ) : receiptPath ? (
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
                  Beleg vorhanden
                </span>
              </div>
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                Ersetzen
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptChange}
                  className="hidden"
                />
              </label>
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  Beleg hochladen
                </span>
                <span className="text-gray-400 text-sm mt-1">
                  Foto oder PDF (max. 10MB)
                </span>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Receipt Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Belegnummer
        </label>
        <input
          type="text"
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
          placeholder="Optional"
          className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Beschreibung
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Weitere Details zur Ausgabe..."
          rows={2}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Interne Notizen
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interne Bemerkungen..."
          rows={2}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading || uploadingReceipt}
            className="flex-1"
          >
            Abbrechen
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || uploadingReceipt}
          loading={loading || uploadingReceipt}
          className="flex-1"
        >
          {uploadingReceipt
            ? 'Beleg wird hochgeladen...'
            : loading
              ? 'Speichern...'
              : isEditing
                ? 'Aktualisieren'
                : 'Ausgabe erfassen'}
        </Button>
      </div>
    </form>
  )
}
