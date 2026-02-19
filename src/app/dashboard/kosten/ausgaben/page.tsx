'use client'

/**
 * Expenses List Page
 *
 * Dashboard page for viewing and managing expenses.
 * Shows expense list with filters and summary stats.
 *
 * Path: /dashboard/kosten/ausgaben
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExpenseList } from '@/components/costs/ExpenseList'
import { ExportButton } from '@/components/costs/ExportButton'
import {
  formatCHF,
  EXPENSE_CATEGORIES,
  formatExpenseCategory,
  getCategoryColor,
} from '@/lib/costs/expense-constants'
import type { ExpenseCategory } from '@/types'

interface CategoryStats {
  category: ExpenseCategory
  count: number
  total: number
}

export default function AusgabenPage() {
  // Stats state
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // Fetch summary stats
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoadingStats(true)

        // Fetch all expenses to calculate stats
        const response = await fetch('/api/expenses?limit=1000')
        if (response.ok) {
          const data = await response.json()
          const expenses = data.expenses || []

          // Calculate totals
          setTotalCount(data.total || expenses.length)
          setTotalAmount(data.totalAmount || 0)

          // Calculate category breakdown
          const categoryMap = new Map<ExpenseCategory, { count: number; total: number }>()

          for (const expense of expenses) {
            const cat = expense.category as ExpenseCategory
            const existing = categoryMap.get(cat) || { count: 0, total: 0 }
            categoryMap.set(cat, {
              count: existing.count + 1,
              total: existing.total + expense.amount,
            })
          }

          // Convert to array and sort by total descending
          const stats: CategoryStats[] = Array.from(categoryMap.entries())
            .map(([category, { count, total }]) => ({ category, count, total }))
            .sort((a, b) => b.total - a.total)

          setCategoryStats(stats)
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6 pb-20">
      <DashboardBreadcrumbs />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Ausgaben
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manuelle Ausgaben und Belege verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton />
          <Link href="/dashboard/kosten/ausgaben/neu">
            <Button>
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Ausgabe erfassen
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card>
          <CardContent className="p-4">
            {loadingStats ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Ausgaben
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCHF(totalAmount)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalCount} Belege
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Categories */}
        {categoryStats.slice(0, 3).map((stat) => (
          <Card key={stat.category}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${getCategoryColor(stat.category).replace('text-', 'bg-').replace('-800', '-500')}`}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatExpenseCategory(stat.category)}
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCHF(stat.total)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stat.count} Ausgaben
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Breakdown (if more than 3) */}
      {categoryStats.length > 3 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Aufschluesselung nach Kategorie
            </h3>
            <div className="space-y-2">
              {categoryStats.map((stat) => {
                const percentage = totalAmount > 0
                  ? (stat.total / totalAmount) * 100
                  : 0

                return (
                  <div key={stat.category} className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(stat.category)}`}
                    >
                      {formatExpenseCategory(stat.category)}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-24 text-right">
                      {formatCHF(stat.total)}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      <ExpenseList />
    </div>
  )
}
