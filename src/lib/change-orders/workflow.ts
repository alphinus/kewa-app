/**
 * Change Order Workflow Utilities
 *
 * Client-safe constants and utilities for change order status management.
 * Includes German labels, color codes, and valid status transitions.
 *
 * Phase 21-01: Change Order CRUD
 */

import type { ChangeOrderStatus, ChangeOrderReason } from '@/types/change-orders'

// ============================================
// STATUS TRANSITIONS
// ============================================

/**
 * Valid status transitions (mirrors database trigger)
 *
 * Workflow:
 * - draft -> submitted (submit for review) or cancelled
 * - submitted -> under_review (assign approver) or cancelled
 * - under_review -> approved, rejected, submitted (counter-offer), or cancelled
 * - approved -> cancelled (with mandatory reason)
 * - rejected, cancelled -> terminal states
 */
export const VALID_TRANSITIONS: Record<ChangeOrderStatus, ChangeOrderStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'cancelled'],
  under_review: ['approved', 'rejected', 'submitted', 'cancelled'],
  approved: ['cancelled'],
  rejected: [],
  cancelled: [],
}

/**
 * Check if transition from current to target status is valid
 */
export function canTransition(
  current: ChangeOrderStatus,
  target: ChangeOrderStatus
): boolean {
  return VALID_TRANSITIONS[current]?.includes(target) ?? false
}

/**
 * Get available next actions for a status
 */
export function getNextActions(status: ChangeOrderStatus): ChangeOrderStatus[] {
  return VALID_TRANSITIONS[status] ?? []
}

// ============================================
// STATUS LABELS (German)
// ============================================

/**
 * Get German display label for change order status
 */
export function getStatusLabel(status: ChangeOrderStatus): string {
  const labels: Record<ChangeOrderStatus, string> = {
    draft: 'Entwurf',
    submitted: 'Eingereicht',
    under_review: 'In Prüfung',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    cancelled: 'Storniert',
  }
  return labels[status] ?? status
}

// ============================================
// STATUS COLORS (Tailwind classes)
// ============================================

/**
 * Get Tailwind CSS classes for status badge
 */
export function getStatusColor(status: ChangeOrderStatus): string {
  const colors: Record<ChangeOrderStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

// ============================================
// REASON LABELS (German)
// ============================================

/**
 * Get German display label for reason category
 */
export const REASON_LABELS: Record<ChangeOrderReason, string> = {
  owner_request: 'Wunsch des Eigentümers',
  unforeseen_conditions: 'Unvorhergesehene Bedingungen',
  design_error: 'Planungsfehler',
  site_conditions: 'Standortbedingungen',
  regulatory_requirement: 'Behördliche Anforderung',
  other: 'Andere',
}

/**
 * Get reason category label
 */
export function getReasonLabel(reason: ChangeOrderReason): string {
  return REASON_LABELS[reason] ?? reason
}

// ============================================
// STATUS OPTIONS FOR FILTERS
// ============================================

export interface ChangeOrderStatusOption {
  value: ChangeOrderStatus | ''
  label: string
}

/**
 * All status options with German labels (for filter dropdowns)
 */
export const CHANGE_ORDER_STATUS_OPTIONS: readonly ChangeOrderStatusOption[] = [
  { value: '', label: 'Alle Status' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'submitted', label: 'Eingereicht' },
  { value: 'under_review', label: 'In Prüfung' },
  { value: 'approved', label: 'Genehmigt' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'cancelled', label: 'Storniert' },
] as const

// ============================================
// REASON OPTIONS FOR FORMS
// ============================================

export interface ChangeOrderReasonOption {
  value: ChangeOrderReason
  label: string
}

/**
 * All reason category options with German labels
 */
export const CHANGE_ORDER_REASON_OPTIONS: readonly ChangeOrderReasonOption[] = [
  { value: 'owner_request', label: 'Wunsch des Eigentümers' },
  { value: 'unforeseen_conditions', label: 'Unvorhergesehene Bedingungen' },
  { value: 'design_error', label: 'Planungsfehler' },
  { value: 'site_conditions', label: 'Standortbedingungen' },
  { value: 'regulatory_requirement', label: 'Behördliche Anforderung' },
  { value: 'other', label: 'Andere' },
] as const
