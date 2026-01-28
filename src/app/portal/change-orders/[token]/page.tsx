/**
 * Client Portal - Change Order Approval Page
 *
 * Public page for clients to view and approve/reject change orders via magic link.
 * Server component fetches data, client component handles actions.
 *
 * Phase 21-04: Client Portal
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientPortalWrapper } from './ClientPortalWrapper'
import type { ChangeOrder } from '@/types/change-orders'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ token: string }>
}

// Generate metadata
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portal/change-orders/${token}`,
      { cache: 'no-store' }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.valid && data.change_order) {
        return {
          title: `Änderungsauftrag ${data.change_order.co_number} - KEWA AG`,
          description: 'Kundenportal für Änderungsauftrag-Genehmigung',
        }
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
  }

  return {
    title: 'Änderungsauftrag - KEWA AG',
    description: 'Kundenportal für Änderungsauftrag-Genehmigung',
  }
}

// Server component to fetch data
export default async function ChangeOrderPortalPage({ params }: PageProps) {
  const { token } = await params

  // Fetch change order data via internal API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/portal/change-orders/${token}`, {
    cache: 'no-store',
  })

  const data = await response.json()

  // Invalid token
  if (!data.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* KEWA Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">KEWA AG</h1>
            <p className="text-gray-600">Kundenportal</p>
          </div>

          {/* Error Card */}
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Link ungültig oder abgelaufen
            </h2>
            <p className="text-gray-600 mb-6">
              {data.error ||
                'Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet.'}
            </p>
            <p className="text-sm text-gray-500">
              Bitte kontaktieren Sie KEWA AG, falls Sie einen neuen Link
              benötigen.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const changeOrder: ChangeOrder = data.change_order
  const showLineItems: boolean = data.show_line_items
  const isProcessed = !['under_review'].includes(changeOrder.status)

  return (
    <ClientPortalWrapper
      changeOrder={changeOrder}
      showLineItems={showLineItems}
      token={token}
      isProcessed={isProcessed}
    />
  )
}
