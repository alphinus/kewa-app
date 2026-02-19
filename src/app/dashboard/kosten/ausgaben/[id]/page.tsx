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
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
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
      <DashboardBreadcrumbs />

      {/* Expense Detail Component */}
      <ExpenseDetail expenseId={id} />
    </div>
  )
}
