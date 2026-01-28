'use client'

/**
 * Edit Change Order Page
 *
 * Form for editing an existing change order (draft only).
 *
 * Path: /dashboard/aenderungsauftraege/[id]/bearbeiten
 * Phase 21-02: Approval Workflow
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChangeOrderForm } from '@/components/change-orders/ChangeOrderForm'
import type { ChangeOrder } from '@/types/change-orders'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function BearbeitenAenderungsauftragPage({ params }: PageProps) {
  const router = useRouter()
  const [changeOrder, setChangeOrder] = useState<ChangeOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [id, setId] = useState<string | null>(null)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  // Fetch change order
  useEffect(() => {
    if (!id) return

    async function fetchChangeOrder() {
      try {
        const res = await fetch(`/api/change-orders/${id}`)
        if (!res.ok) {
          throw new Error('Änderungsauftrag nicht gefunden')
        }
        const data = await res.json()

        // Only allow editing drafts
        if (data.change_order.status !== 'draft') {
          setError('Nur Entwürfe können bearbeitet werden')
          return
        }

        setChangeOrder(data.change_order)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }

    fetchChangeOrder()
  }, [id])

  const handleSubmit = async (data: any, isDraft: boolean) => {
    if (!id) return

    const payload = {
      ...data,
      status: isDraft ? 'draft' : 'submitted',
    }

    const res = await fetch(`/api/change-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Fehler beim Aktualisieren')
    }

    // Redirect to detail page
    router.push(`/dashboard/aenderungsauftraege/${id}`)
  }

  const handleCancel = () => {
    if (id) {
      router.push(`/dashboard/aenderungsauftraege/${id}`)
    } else {
      router.push('/dashboard/aenderungsauftraege')
    }
  }

  if (!id) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Laden...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Änderungsauftrag wird geladen...</p>
      </div>
    )
  }

  if (error || !changeOrder) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error || 'Änderungsauftrag nicht gefunden'}</p>
          <Link
            href="/dashboard/aenderungsauftraege"
            className="mt-2 text-sm text-red-700 underline inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/aenderungsauftraege"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Änderungsaufträge
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/aenderungsauftraege/${id}`}
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          {changeOrder.co_number}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Bearbeiten</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Änderungsauftrag bearbeiten
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {changeOrder.co_number}
        </p>
      </div>

      {/* Form */}
      <ChangeOrderForm
        changeOrder={changeOrder}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}
