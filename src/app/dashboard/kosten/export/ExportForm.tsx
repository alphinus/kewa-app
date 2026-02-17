'use client'

/**
 * ExportForm - Client component for export configuration
 *
 * Inline export form (not modal) for the dedicated export page.
 * Provides same functionality as ExportModal but in full-page layout.
 *
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { INVOICE_STATUS_OPTIONS } from '@/lib/costs/invoice-constants'
import type { ExportType } from '@/lib/costs/csv-export'

interface Project {
  id: string
  name: string
}

interface ExportFormProps {
  /** Available projects for filtering */
  projects: Project[]
}

/**
 * ExportForm - Export configuration form
 */
export function ExportForm({ projects }: ExportFormProps) {
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
  const [success, setSuccess] = useState(false)

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

  /**
   * Handle export download
   */
  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setSuccess(false)

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

      setSuccess(true)
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
   * Clear all filters
   */
  const clearFilters = () => {
    setProjectId('')
    setDateFrom('')
    setDateTo('')
    setSelectedStatuses([])
  }

  const hasFilters = projectId || dateFrom || dateTo || selectedStatuses.length > 0

  return (
    <div className="space-y-6">
      {/* Export Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Was möchten Sie exportieren?
        </label>
        <div className="flex gap-3">
          <TypeButton
            label="Alle Kosten"
            description="Rechnungen + Ausgaben"
            value="all"
            selected={exportType === 'all'}
            onClick={() => setExportType('all')}
          />
          <TypeButton
            label="Nur Rechnungen"
            description="Eingangsrechnungen"
            value="invoices"
            selected={exportType === 'invoices'}
            onClick={() => setExportType('invoices')}
          />
          <TypeButton
            label="Nur Ausgaben"
            description="Manuelle Ausgaben"
            value="expenses"
            selected={exportType === 'expenses'}
            onClick={() => setExportType('expenses')}
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Filter (optional)
          </h3>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Filter */}
          <div>
            <label
              htmlFor="export-project"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Projekt
            </label>
            <select
              id="export-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Alle Projekte</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Empty cell for grid alignment */}
          <div className="hidden md:block" />

          {/* Date Range */}
          <div>
            <label
              htmlFor="export-date-from"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Datum von
            </label>
            <input
              id="export-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="export-date-to"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Datum bis
            </label>
            <input
              id="export-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Status Filter (only for invoices) */}
        {(exportType === 'invoices' || exportType === 'all') && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rechnungsstatus
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
                Keine Auswahl = Alle Status werden exportiert
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview & Export */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          {/* Preview */}
          <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
              <div className="grid grid-cols-3 gap-4 text-center">
                {(exportType === 'invoices' || exportType === 'all') && (
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {preview.invoiceCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Rechnungen
                    </div>
                  </div>
                )}
                {(exportType === 'expenses' || exportType === 'all') && (
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {preview.expenseCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ausgaben
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {preview.totalCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Zeilen
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Keine Daten verfügbar
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="md:w-48">
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
              CSV herunterladen
            </Button>
          </div>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
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
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              Export erfolgreich heruntergeladen
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Type selection button with description
 */
function TypeButton({
  label,
  description,
  value,
  selected,
  onClick,
}: {
  label: string
  description: string
  value: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-3 rounded-lg text-left transition-colors border-2 ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div
        className={`text-sm font-medium ${
          selected
            ? 'text-blue-700 dark:text-blue-300'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {label}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {description}
      </div>
    </button>
  )
}
