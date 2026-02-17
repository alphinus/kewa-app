'use client'

/**
 * New Invoice Page
 *
 * Page for creating a new invoice from a work order.
 * Supports pre-selection of work order from query params.
 *
 * Path: /dashboard/kosten/rechnungen/neu
 * Phase 12.2-01: Invoice Creation Form & Page
 */

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { InvoiceForm } from '@/components/costs/InvoiceForm'
import type { Invoice } from '@/types/database'

export default function NeueRechnungPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get pre-selection from query params
  const workOrderId = searchParams.get('work_order_id') ?? undefined

  // Handle success - redirect to invoice detail
  function handleSuccess(invoice: Invoice) {
    router.push(`/dashboard/kosten/rechnungen/${invoice.id}`)
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
          href="/dashboard/kosten/rechnungen"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Rechnungen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Neu erfassen</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Rechnung erfassen
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Erstellen Sie eine Rechnung für einen abgeschlossenen Arbeitsauftrag
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          <InvoiceForm
            workOrderId={workOrderId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* Help text */}
      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          <strong>Hinweis:</strong> Rechnungen werden als Entwurf gespeichert und können
          später bearbeitet werden.
        </p>
        <p>
          Wählen Sie einen abgeschlossenen Arbeitsauftrag (Status: done oder accepted)
          aus, um die Rechnung zu erstellen. Alle relevanten Daten werden automatisch
          übernommen.
        </p>
      </div>
    </div>
  )
}
