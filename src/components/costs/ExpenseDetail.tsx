'use client'

/**
 * ExpenseDetail Component
 *
 * Full expense information display with receipt viewer.
 * Supports edit and delete actions.
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  formatCHF,
  formatSwissDate,
  formatExpenseCategory,
  formatPaymentMethod,
  getCategoryColor,
} from '@/lib/costs/expense-constants'
import { ExpenseForm } from './ExpenseForm'
import type { ExpenseWithRelations } from '@/lib/costs/expense-queries'

interface ExpenseDetailProps {
  /** Expense ID to display */
  expenseId: string
}

export function ExpenseDetail({ expenseId }: ExpenseDetailProps) {
  const router = useRouter()

  // State
  const [expense, setExpense] = useState<ExpenseWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  // Fetch expense
  useEffect(() => {
    async function fetchExpense() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/expenses/${expenseId}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ausgabe nicht gefunden')
          }
          throw new Error('Fehler beim Laden der Ausgabe')
        }

        const data = await response.json()
        setExpense(data.expense)

        // Generate signed URL for receipt if exists
        if (data.expense.receipt_storage_path) {
          await fetchReceiptUrl(data.expense.receipt_storage_path)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchExpense()
  }, [expenseId])

  // Fetch receipt URL
  async function fetchReceiptUrl(storagePath: string) {
    try {
      // Generate signed URL from storage
      // For now, construct public URL pattern
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (baseUrl) {
        setReceiptUrl(`${baseUrl}/storage/v1/object/public/media/${storagePath}`)
      }
    } catch (err) {
      console.error('Error fetching receipt URL:', err)
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!expense) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Loeschen fehlgeschlagen')
      }

      router.push('/dashboard/kosten/ausgaben')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  // Handle edit success
  function handleEditSuccess(updatedExpense: ExpenseWithRelations) {
    setExpense(updatedExpense)
    setIsEditing(false)
    router.refresh()
  }

  // Get entity display
  function getEntityDisplay(): { label: string; value: string } | null {
    if (!expense) return null

    if (expense.project) {
      return { label: 'Projekt', value: expense.project.name }
    }
    if (expense.unit) {
      return {
        label: 'Einheit',
        value: expense.unit.building
          ? `${expense.unit.name} (${expense.unit.building.name})`
          : expense.unit.name,
      }
    }
    if (expense.work_order) {
      return { label: 'Arbeitsauftrag', value: expense.work_order.title }
    }
    return null
  }

  // Loading state
  if (loading) {
    return (
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
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Fehler
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push('/dashboard/kosten/ausgaben')}
          >
            Zurueck zur Liste
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!expense) return null

  const entityDisplay = getEntityDisplay()

  // Edit mode
  if (isEditing) {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Ausgabe bearbeiten
          </h2>
          <ExpenseForm
            expense={expense}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {expense.title}
          </h1>
          <p className="text-gray-500 mt-1">
            {formatSwissDate(expense.paid_at)} - {formatExpenseCategory(expense.category)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsEditing(true)}
          >
            Bearbeiten
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Loeschen
          </Button>
        </div>
      </div>

      {/* Amount Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Betrag</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatCHF(expense.amount)}
              </p>
            </div>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                getCategoryColor(expense.category)
              )}
            >
              {formatExpenseCategory(expense.category)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Details
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Zahlungsart</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatPaymentMethod(expense.payment_method)}
              </dd>
            </div>

            {entityDisplay && (
              <div>
                <dt className="text-sm text-gray-500">{entityDisplay.label}</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {entityDisplay.value}
                </dd>
              </div>
            )}

            {expense.vendor_name && (
              <div>
                <dt className="text-sm text-gray-500">Lieferant</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {expense.vendor_name}
                </dd>
              </div>
            )}

            {expense.receipt_number && (
              <div>
                <dt className="text-sm text-gray-500">Belegnummer</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {expense.receipt_number}
                </dd>
              </div>
            )}

            {expense.paid_by_user && (
              <div>
                <dt className="text-sm text-gray-500">Bezahlt von</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {expense.paid_by_user.display_name}
                </dd>
              </div>
            )}

            {expense.created_by_user && (
              <div>
                <dt className="text-sm text-gray-500">Erfasst von</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {expense.created_by_user.display_name}
                </dd>
              </div>
            )}
          </dl>

          {expense.description && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <dt className="text-sm text-gray-500 mb-1">Beschreibung</dt>
              <dd className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {expense.description}
              </dd>
            </div>
          )}

          {expense.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <dt className="text-sm text-gray-500 mb-1">Interne Notizen</dt>
              <dd className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {expense.notes}
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Card */}
      {expense.receipt_storage_path && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Beleg
            </h3>
            {receiptUrl ? (
              <div className="space-y-4">
                {/* Preview for images */}
                {expense.receipt_storage_path.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptUrl}
                      alt="Beleg"
                      className="max-w-full h-auto max-h-[500px] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  // PDF or other document
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <svg
                      className="w-10 h-10 text-red-500"
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
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        PDF Dokument
                      </p>
                      <p className="text-sm text-gray-500">
                        Klicken Sie zum Oeffnen
                      </p>
                    </div>
                  </div>
                )}

                {/* View/Download button */}
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Beleg oeffnen
                </a>
              </div>
            ) : (
              <p className="text-gray-500">Beleg konnte nicht geladen werden</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Ausgabe loeschen?
              </h3>
              <p className="text-gray-500 mb-6">
                Moechten Sie die Ausgabe &quot;{expense.title}&quot; wirklich
                loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  Loeschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
