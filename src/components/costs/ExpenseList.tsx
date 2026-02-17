'use client'

/**
 * ExpenseList Component
 *
 * Table display of expenses with filters and category badges.
 * Click row to navigate to detail view.
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  EXPENSE_CATEGORIES,
  formatCHF,
  formatSwissDate,
  formatExpenseCategory,
  getCategoryColor,
} from '@/lib/costs/expense-constants'
import type { ExpenseWithRelations } from '@/lib/costs/expense-queries'
import type { ExpenseCategory } from '@/types'

interface Project {
  id: string
  name: string
}

interface ExpenseListProps {
  /** Pre-filter by project */
  projectId?: string
  /** Pre-filter by unit */
  unitId?: string
  /** Show compact view (fewer columns) */
  compact?: boolean
}

export function ExpenseList({
  projectId: initialProjectId,
  unitId: initialUnitId,
  compact = false,
}: ExpenseListProps) {
  const router = useRouter()

  // Data state
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  // Filter state
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '')
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  // Fetch projects for filter
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }

    fetchProjects()
  }, [])

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedProjectId) params.set('project_id', selectedProjectId)
      if (initialUnitId) params.set('unit_id', initialUnitId)
      if (selectedCategory) params.set('category', selectedCategory)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('limit', limit.toString())
      params.set('offset', offset.toString())

      const response = await fetch(`/api/expenses?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Ausgaben')
      }

      const data = await response.json()
      setExpenses(data.expenses || [])
      setTotal(data.total || 0)
      setTotalAmount(data.totalAmount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId, initialUnitId, selectedCategory, dateFrom, dateTo, limit, offset])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Handle row click
  function handleRowClick(expenseId: string) {
    router.push(`/dashboard/kosten/ausgaben/${expenseId}`)
  }

  // Reset filters
  function resetFilters() {
    setSelectedProjectId(initialProjectId ?? '')
    setSelectedCategory('')
    setDateFrom('')
    setDateTo('')
    setOffset(0)
  }

  // Get entity name for display
  function getEntityName(expense: ExpenseWithRelations): string {
    if (expense.project) {
      return expense.project.name
    }
    if (expense.unit) {
      return expense.unit.name
    }
    return '-'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!compact && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Project Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Projekt
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Alle Projekte</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Kategorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value as ExpenseCategory | '')
                    setOffset(0)
                  }}
                  className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Alle Kategorien</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Von
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Bis
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full h-10 px-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
            </div>

            {/* Active filters indicator */}
            {(selectedProjectId || selectedCategory || dateFrom || dateTo) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-500">Filter aktiv</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Zurücksetzen
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchExpenses}
            className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Laden...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && expenses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Keine Ausgaben gefunden
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {selectedProjectId || selectedCategory || dateFrom || dateTo
                ? 'Versuchen Sie andere Filtereinstellungen'
                : 'Erfassen Sie Ihre erste Ausgabe'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expenses table */}
      {!loading && !error && expenses.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bezeichnung
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betrag
                    </th>
                    {!compact && (
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Projekt/Einheit
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      onClick={() => handleRowClick(expense.id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatSwissDate(expense.paid_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {expense.title}
                        </div>
                        {expense.vendor_name && (
                          <div className="text-xs text-gray-500">
                            {expense.vendor_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            getCategoryColor(expense.category)
                          )}
                        >
                          {formatExpenseCategory(expense.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatCHF(expense.amount)}
                      </td>
                      {!compact && (
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {getEntityName(expense)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <td
                      colSpan={compact ? 3 : 4}
                      className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100"
                    >
                      Total ({total} Ausgaben)
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCHF(totalAmount)}
                    </td>
                    {!compact && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && !error && total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Zeige {offset + 1}-{Math.min(offset + limit, total)} von {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
