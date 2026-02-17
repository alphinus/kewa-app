'use client'

/**
 * New Expense Page
 *
 * Page for creating a new expense entry.
 * Supports pre-selection of project/unit from query params.
 *
 * Path: /dashboard/kosten/ausgaben/neu
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ExpenseForm } from '@/components/costs/ExpenseForm'
import type { Expense } from '@/types/database'

export default function NeueAusgabePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get pre-selection from query params
  const projectId = searchParams.get('project_id') ?? undefined
  const unitId = searchParams.get('unit_id') ?? undefined

  // Handle success - redirect to list
  function handleSuccess(expense: Expense) {
    router.push('/dashboard/kosten/ausgaben')
  }

  // Handle cancel - go back
  function handleCancel() {
    router.back()
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/kosten/ausgaben"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Ausgaben
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Neu erfassen</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ausgabe erfassen
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Erfassen Sie eine manuelle Ausgabe mit Beleg
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <ExpenseForm
            projectId={projectId}
            unitId={unitId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* Help text */}
      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          <strong>Hinweis:</strong> Alle Ausgaben müssen mit einem Beleg (Foto oder PDF)
          dokumentiert werden.
        </p>
        <p>
          Die Ausgabe wird automatisch einem Projekt oder einer Einheit zugeordnet.
          Wählen Sie die passende Zuordnung aus.
        </p>
      </div>
    </div>
  )
}
