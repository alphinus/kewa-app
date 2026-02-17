'use client'

/**
 * Create Work Order Page
 *
 * Client component wrapping WorkOrderForm with:
 * - URL searchParams for default project_id and task_id
 * - Navigation on save/cancel
 *
 * Path: /dashboard/auftraege/neu
 * Phase 09-07: Work Order UI Integration
 */

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm'
import type { WorkOrderWithRelations } from '@/types/work-order'

/**
 * Inner component that uses searchParams
 * Wrapped in Suspense because useSearchParams needs it
 */
function CreateWorkOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectId = searchParams.get('project_id') ?? undefined
  const taskId = searchParams.get('task_id') ?? undefined

  /**
   * Handle successful save - redirect to detail page
   */
  function handleSave(workOrder: WorkOrderWithRelations) {
    router.push(`/dashboard/auftraege/${workOrder.id}`)
  }

  /**
   * Handle cancel - go back or to list
   */
  function handleCancel() {
    // If we came from a project, go back
    if (projectId) {
      router.push(`/dashboard/projekte/${projectId}`)
    } else {
      router.push('/dashboard/auftraege')
    }
  }

  return (
    <WorkOrderForm
      mode="create"
      defaultProjectId={projectId}
      defaultTaskId={taskId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}

/**
 * Loading state for Suspense
 */
function LoadingState() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg">
        <div className="text-center text-gray-500">Laden...</div>
      </div>
    </div>
  )
}

/**
 * Create Work Order Page
 */
export default function CreateWorkOrderPage() {
  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/auftraege"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Arbeitsaufträge
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Neuer Auftrag</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Neuer Arbeitsauftrag
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Erstellen Sie einen Arbeitsauftrag für einen externen Handwerker.
        </p>
      </div>

      {/* Form wrapped in Suspense */}
      <Suspense fallback={<LoadingState />}>
        <CreateWorkOrderContent />
      </Suspense>
    </div>
  )
}
