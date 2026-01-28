'use client'

/**
 * Client Portal Wrapper Component
 *
 * Handles client-side state for change order approval/rejection feedback.
 * Phase 21-04: Client Portal
 */

import { useState } from 'react'
import { ClientApprovalView } from '@/components/change-orders/ClientApprovalView'
import type { ChangeOrder } from '@/types/change-orders'

interface ClientPortalWrapperProps {
  changeOrder: ChangeOrder
  showLineItems: boolean
  token: string
  isProcessed: boolean
}

export function ClientPortalWrapper({
  changeOrder,
  showLineItems,
  token,
  isProcessed: initialProcessed,
}: ClientPortalWrapperProps) {
  const [isProcessed, setIsProcessed] = useState(initialProcessed)
  const [status, setStatus] = useState<'approved' | 'rejected' | null>(null)

  const handleApprove = () => {
    setIsProcessed(true)
    setStatus('approved')
  }

  const handleReject = () => {
    setIsProcessed(true)
    setStatus('rejected')
  }

  // Show success message if just processed
  if (status) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">KEWA AG</h1>
            <p className="text-blue-100 text-sm">Kundenportal</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-16 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                status === 'approved' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {status === 'approved' ? (
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
            </h2>
            <p className="text-gray-600 mb-6">
              {status === 'approved'
                ? 'Der Änderungsauftrag wurde erfolgreich genehmigt.'
                : 'Der Änderungsauftrag wurde abgelehnt.'}
            </p>
            <p className="text-sm text-gray-500">
              KEWA AG wurde benachrichtigt und wird sich bei Ihnen melden.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ClientApprovalView
      changeOrder={changeOrder}
      showLineItems={showLineItems}
      token={token}
      onApprove={handleApprove}
      onReject={handleReject}
      isProcessed={isProcessed}
    />
  )
}
