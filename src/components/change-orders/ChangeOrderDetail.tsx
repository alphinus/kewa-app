'use client'

/**
 * ChangeOrderDetail Component
 *
 * Full detail view of a change order.
 * Shows header, info grid, line items, approval workflow, and version history.
 *
 * Phase 21-02: Approval Workflow
 */

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge'
import { LineItemEditor } from './LineItemEditor'
import { ApprovalWorkflowCard } from './ApprovalWorkflowCard'
import { VersionHistoryTimeline } from './VersionHistoryTimeline'
import type { ChangeOrder, ChangeOrderVersion } from '@/types/change-orders'
import {
  formatCHF,
  formatSwissDate,
  formatCONumber,
} from '@/lib/change-orders/queries'
import { getReasonLabel } from '@/lib/change-orders/workflow'

interface ChangeOrderDetailProps {
  changeOrder: ChangeOrder
  versions?: ChangeOrderVersion[]
  currentUserId: string
  currentUserRole: string
}

export function ChangeOrderDetail({
  changeOrder,
  versions = [],
  currentUserId,
  currentUserRole,
}: ChangeOrderDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {formatCONumber(changeOrder.co_number)}
              </h2>
              {changeOrder.work_order && (
                <Link
                  href={`/dashboard/arbeitsauftraege/${changeOrder.work_order.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Arbeitsauftrag: {changeOrder.work_order.wo_number} -{' '}
                  {changeOrder.work_order.title}
                </Link>
              )}
            </div>
            <ChangeOrderStatusBadge status={changeOrder.status} />
          </div>

          <p className="text-gray-700 dark:text-gray-300">
            {changeOrder.description}
          </p>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Reason Category */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Grund
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getReasonLabel(changeOrder.reason_category)}
            </p>
          </CardContent>
        </Card>

        {/* Schedule Impact */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Zeitplan-Auswirkung
            </p>
            <p
              className={`text-sm font-medium ${
                changeOrder.schedule_impact_days < 0
                  ? 'text-green-600'
                  : changeOrder.schedule_impact_days > 0
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {changeOrder.schedule_impact_days > 0 ? '+' : ''}
              {changeOrder.schedule_impact_days} Tage
            </p>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Gesamtbetrag
            </p>
            <p
              className={`text-lg font-bold ${
                changeOrder.total_amount < 0
                  ? 'text-red-600'
                  : changeOrder.total_amount > 0
                  ? 'text-green-600'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {changeOrder.total_amount < 0 ? '' : '+'}
              {formatCHF(changeOrder.total_amount)}
            </p>
          </CardContent>
        </Card>

        {/* Version */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Version
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {changeOrder.version}
            </p>
          </CardContent>
        </Card>

        {/* Created */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Erstellt
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatSwissDate(changeOrder.created_at)}
            </p>
          </CardContent>
        </Card>

        {/* Creator Type */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Erstellt von
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {changeOrder.creator_type === 'internal' ? 'Intern' : 'Handwerker'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reason Details */}
      {changeOrder.reason_details && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Detaillierte Begründung
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {changeOrder.reason_details}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Positionen
          </h3>
          <LineItemEditor
            items={changeOrder.line_items}
            onChange={() => {}}
            readOnly
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Workflow (if not draft) */}
        {changeOrder.status !== 'draft' && (
          <ApprovalWorkflowCard
            changeOrder={changeOrder}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )}

        {/* Version History */}
        {versions.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Versionsverlauf
              </h3>
              <VersionHistoryTimeline
                versions={versions}
                currentVersion={changeOrder.version}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancellation Reason */}
      {changeOrder.status === 'cancelled' && changeOrder.cancelled_reason && (
        <Card>
          <CardContent className="p-6 bg-red-50 dark:bg-red-900/10">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
              Grund der Stornierung
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {changeOrder.cancelled_reason}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
