'use client'

/**
 * Create Change Order Page
 *
 * Form for creating a new change order.
 *
 * Path: /dashboard/aenderungsauftraege/neu
 * Phase 21-02: Approval Workflow
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { ChangeOrderForm } from '@/components/change-orders/ChangeOrderForm'

export default function NeuAenderungsauftragPage() {
  const router = useRouter()

  const handleSubmit = async (data: any, isDraft: boolean) => {
    const payload = {
      ...data,
      status: isDraft ? 'draft' : 'submitted',
    }

    const res = await fetch('/api/change-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Fehler beim Erstellen')
    }

    const result = await res.json()

    // Redirect to detail page
    router.push(`/dashboard/aenderungsauftraege/${result.change_order.id}`)
  }

  const handleCancel = () => {
    router.push('/dashboard/aenderungsauftraege')
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Neuer Änderungsauftrag
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Erstellen Sie einen neuen Änderungsauftrag
        </p>
      </div>

      {/* Form */}
      <ChangeOrderForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  )
}
