/**
 * Inspection Workflow Utilities
 *
 * Status transition validation and inspection completion logic
 * Phase: 22-inspection-core
 */

import type {
  InspectionStatus,
  DefectStatus,
  InspectionResult,
  InspectionDefect,
  ChecklistSectionResult,
} from '@/types/inspections'

// =============================================
// STATUS TRANSITION VALIDATION
// =============================================

/**
 * Valid inspection status transitions
 */
const INSPECTION_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  in_progress: ['completed'],
  completed: ['signed'],
  signed: [],
}

/**
 * Valid defect status transitions
 */
const DEFECT_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  open: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: [],
}

/**
 * Validate inspection status transition
 *
 * @param currentStatus Current status
 * @param newStatus Desired new status
 * @returns Validation result with error message if invalid
 */
export function validateInspectionTransition(
  currentStatus: InspectionStatus,
  newStatus: InspectionStatus
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  const allowedTransitions = INSPECTION_TRANSITIONS[currentStatus]

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate defect status transition
 *
 * @param currentStatus Current status
 * @param newStatus Desired new status
 * @returns Validation result with error message if invalid
 */
export function validateDefectTransition(
  currentStatus: DefectStatus,
  newStatus: DefectStatus
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  const allowedTransitions = DEFECT_TRANSITIONS[currentStatus]

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid defect status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
    }
  }

  return { valid: true }
}

// =============================================
// INSPECTION COMPLETION VALIDATION
// =============================================

/**
 * Check if inspection can be completed
 *
 * Warns about unchecked items but does not block completion.
 *
 * @param checklistItems Checklist items from inspection
 * @returns Completion check with warnings
 */
export function canCompleteInspection(
  checklistItems: ChecklistSectionResult[]
): { canComplete: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Count total items and checked items
  let totalItems = 0
  let checkedItems = 0

  for (const section of checklistItems) {
    for (const item of section.items) {
      totalItems++
      if (item.status && item.status !== 'na') {
        checkedItems++
      }
    }
  }

  // Warn if not all items checked
  if (checkedItems < totalItems) {
    const uncheckedCount = totalItems - checkedItems
    warnings.push(
      `${uncheckedCount} von ${totalItems} Checklistenpunkten sind noch nicht geprüft`
    )
  }

  // Always allow completion (warnings only)
  return { canComplete: true, warnings }
}

// =============================================
// OVERALL RESULT COMPUTATION
// =============================================

/**
 * Compute overall inspection result based on defect severity and status
 *
 * Logic:
 * - Any open 'schwer' (critical) defect => 'failed'
 * - Any open defect (but no critical) => 'passed_with_conditions'
 * - No open defects => 'passed'
 *
 * @param defects List of defects from inspection
 * @returns Overall inspection result
 */
export function computeOverallResult(
  defects: InspectionDefect[]
): InspectionResult {
  // Filter to open defects only
  const openDefects = defects.filter((d) => d.status === 'open')

  if (openDefects.length === 0) {
    return 'passed'
  }

  // Check for critical open defects
  const hasCriticalOpen = openDefects.some((d) => d.severity === 'schwer')

  if (hasCriticalOpen) {
    return 'failed'
  }

  // Has open defects but none critical
  return 'passed_with_conditions'
}
