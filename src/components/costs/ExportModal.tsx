'use client'

/**
 * ExportModal - CSV Export Configuration Modal
 *
 * Allows users to configure and download cost data exports.
 * Features:
 * - Type selection: Rechnungen, Ausgaben, Alle
 * - Project filter (optional)
 * - Date range picker
 * - Status filter for invoices
 * - Preview row count
 * - Download button triggers API
 *
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { INVOICE_STATUS_OPTIONS } from '@/lib/costs/invoice-constants'
import type { ExportType } from '@/lib/costs/csv-export'

interface Project {
  id: string
  name: string
}

interface ExportModalProps {
  /** Available projects for filtering */
  projects: Project[]
  /** Callback when modal is closed */
  onClose: () => void
}

/**
 * ExportModal - Configure and download CSV exports
 */
export function ExportModal({ projects, onClose }: ExportModalProps) {
  // Form state
  const [exportType, setExportType] = useState<ExportType>('all')
  const [projectId, setProjectId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Preview state
  const [preview, setPreview] = useState<{
    invoiceCount: number
    expenseCount: number
    totalCount: number
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch preview counts when filters change
  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('type', exportType)
      if (projectId) params.set('projectId', projectId)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (selectedStatuses.length > 0) {
        params.set('status', selectedStatuses.join(','))
      }

      const response = await fetch(`/api/costs/export?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPreview(data)
      } else {
        const data = await response.json()
        setError(data.error || 'Vorschau konnte nicht geladen werden')
      }
    } catch (err) {
      console.error('Error fetching preview:', err)
      setError('Verbindungsfehler beim Laden der Vorschau')
    } finally {
      setLoadingPreview(false)
    }
  }, [exportType, projectId, dateFrom, dateTo, selectedStatuses])

  // Debounce preview fetch
  useEffect(() => {
    const timer = setTimeout(fetchPreview, 300)
    return () => clearTimeout(timer)
  }, [fetchPreview])

  // Focus trap and escape key handling
  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exporting) {
        onClose()
      }
    }

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleFocusTrap)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleFocusTrap)
      document.body.style.overflow = ''
    }
  }, [exporting, onClose])

  /**
   * Handle export download
   */
  const handleExport = async () => {
    setExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/costs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: exportType,
          projectId: projectId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Export fehlgeschlagen')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'kosten-export.csv'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Close modal on success
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setExporting(false)
    }
  }

  /**
   * Toggle status selection
   */
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !exporting) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <h2
          id="export-modal-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          CSV Export
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Exportieren Sie Rechnungen und Ausgaben als CSV-Datei fuer Excel.
        </p>

        {/* Form */}
        <div className="mt-6 space-y-4">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exporttyp
            </label>
            <div className="flex gap-2">
              <TypeButton
                label="Alle"
                value="all"
                selected={exportType === 'all'}
                onClick={() => setExportType('all')}
              />
              <TypeButton
                label="Rechnungen"
                value="invoices"
                selected={exportType === 'invoices'}
                onClick={() => setExportType('invoices')}
              />
              <TypeButton
                label="Ausgaben"
                value="expenses"
                selected={exportType === 'expenses'}
                onClick={() => setExportType('expenses')}
              />
            </div>
          </div>

          {/* Project Filter */}
          <div>
            <label
              htmlFor="export-project"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Projekt (optional)
            </label>
            <select
              id="export-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Alle Projekte</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="export-date-from"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Von
              </label>
              <input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="export-date-to"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bis
              </label>
              <input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter (only for invoices) */}
          {(exportType === 'invoices' || exportType === 'all') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rechnungsstatus (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {INVOICE_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleStatus(option.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedStatuses.includes(option.value)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {selectedStatuses.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Keine Auswahl = Alle Status
                </p>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Vorschau
          </div>
          {loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Wird geladen...
            </div>
          ) : preview ? (
            <div className="space-y-1 text-sm">
              {(exportType === 'invoices' || exportType === 'all') && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Rechnungen
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {preview.invoiceCount}
                  </span>
                </div>
              )}
              {(exportType === 'expenses' || exportType === 'all') && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Ausgaben
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {preview.expenseCount}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Total Zeilen
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {preview.totalCount}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Keine Daten verfuegbar
            </div>
          )}
        </div>

        {/* Format Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Format:</strong> CSV mit Semikolon-Trennung, UTF-8 Kodierung.
            Optimiert fuer Excel (Schweiz/Deutschland). Datumsformat: TT.MM.JJJJ
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={exporting}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleExport}
            loading={exporting}
            disabled={!preview || preview.totalCount === 0}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exportieren
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Type selection button
 */
function TypeButton({
  label,
  value,
  selected,
  onClick,
}: {
  label: string
  value: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        selected
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
