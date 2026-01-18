'use client'

/**
 * Expense Detail Page
 *
 * Page for viewing a single expense with edit/delete actions.
 *
 * Path: /dashboard/kosten/ausgaben/[id]
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import { use } from 'react'
import Link from 'next/link'
import { ExpenseDetail } from '@/components/costs/ExpenseDetail'

interface ExpenseDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = use(params)

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
        <span className="text-gray-900 dark:text-gray-100">Details</span>
      </nav>

      {/* Expense Detail Component */}
      <ExpenseDetail expenseId={id} />
    </div>
  )
}
