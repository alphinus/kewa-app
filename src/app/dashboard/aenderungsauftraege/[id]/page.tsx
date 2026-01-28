/**
 * Change Order Detail Page
 *
 * Displays full change order details with workflow actions.
 *
 * Path: /dashboard/aenderungsauftraege/[id]
 * Phase 21-02: Approval Workflow
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ChangeOrderDetail } from '@/components/change-orders/ChangeOrderDetail'
import { CHANGE_ORDER_SELECT } from '@/lib/change-orders/queries'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AenderungsauftragDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch change order
  const { data: changeOrder, error } = await supabase
    .from('change_orders')
    .select(CHANGE_ORDER_SELECT)
    .eq('id', id)
    .single()

  if (error || !changeOrder) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Änderungsauftrag nicht gefunden</p>
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

  // Fetch version history
  const { data: versions } = await supabase
    .from('change_order_versions')
    .select('*')
    .eq('change_order_id', id)
    .order('version', { ascending: false })

  // Get user role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const userRole = profile?.role ?? 'imeri'

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
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
        <span className="text-gray-900 dark:text-gray-100">
          {changeOrder.co_number}
        </span>
      </nav>

      {/* Action buttons */}
      <div className="mb-6 flex items-center gap-3">
        {changeOrder.status === 'draft' && (
          <Link href={`/dashboard/aenderungsauftraege/${id}/bearbeiten`}>
            <Button>Bearbeiten</Button>
          </Link>
        )}
        <Link href="/dashboard/aenderungsauftraege">
          <Button variant="outline">Zurück</Button>
        </Link>
      </div>

      {/* Change Order Detail */}
      <ChangeOrderDetail
        changeOrder={changeOrder}
        versions={versions ?? []}
        currentUserId={user.id}
        currentUserRole={userRole}
      />
    </div>
  )
}
