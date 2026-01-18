/**
 * Deadline Check Utilities
 *
 * Functions for checking work order deadline status.
 * Used in UI components for consistent styling.
 *
 * Implements: EXT-16 (Deadline displayed with countdown)
 */

// ============================================
// TYPES
// ============================================

export type DeadlineStatus = 'ok' | 'warning' | 'urgent' | 'expired'

export interface WorkOrderWithDeadline {
  acceptance_deadline?: string | null
  status?: string
}

// ============================================
// THRESHOLDS (in milliseconds)
// ============================================

const HOURS_48 = 48 * 60 * 60 * 1000
const HOURS_24 = 24 * 60 * 60 * 1000

// ============================================
// FUNCTIONS
// ============================================

/**
 * Check if deadline has passed.
 *
 * @param workOrder - Work order with deadline
 * @returns true if deadline is past
 */
export function isDeadlinePassed(workOrder: WorkOrderWithDeadline): boolean {
  if (!workOrder.acceptance_deadline) return false
  return new Date(workOrder.acceptance_deadline).getTime() < Date.now()
}

/**
 * Check if deadline has passed (from deadline string).
 *
 * @param deadline - Deadline timestamp string
 * @returns true if deadline is past
 */
export function isDeadlinePassedFromString(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

/**
 * Get deadline status for UI styling.
 *
 * @param deadline - Deadline timestamp string
 * @returns Status: 'ok' (>48h), 'warning' (24-48h), 'urgent' (<24h), 'expired'
 */
export function getDeadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return 'ok'

  const deadlineTime = new Date(deadline).getTime()
  const now = Date.now()
  const remaining = deadlineTime - now

  if (remaining <= 0) {
    return 'expired'
  } else if (remaining <= HOURS_24) {
    return 'urgent'
  } else if (remaining <= HOURS_48) {
    return 'warning'
  } else {
    return 'ok'
  }
}

/**
 * Get deadline status from work order object.
 *
 * @param workOrder - Work order with deadline
 * @returns Status: 'ok' (>48h), 'warning' (24-48h), 'urgent' (<24h), 'expired'
 */
export function getWorkOrderDeadlineStatus(
  workOrder: WorkOrderWithDeadline
): DeadlineStatus {
  return getDeadlineStatus(workOrder.acceptance_deadline || null)
}

/**
 * Get time remaining until deadline.
 *
 * @param deadline - Deadline timestamp string
 * @returns Object with days, hours, minutes, and total milliseconds
 */
export function getTimeRemaining(deadline: string | null): {
  days: number
  hours: number
  minutes: number
  totalMs: number
  isExpired: boolean
} {
  if (!deadline) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      totalMs: 0,
      isExpired: false,
    }
  }

  const deadlineTime = new Date(deadline).getTime()
  const now = Date.now()
  const remaining = deadlineTime - now

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      totalMs: 0,
      isExpired: true,
    }
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  return {
    days,
    hours,
    minutes,
    totalMs: remaining,
    isExpired: false,
  }
}

/**
 * Format remaining time as German string.
 *
 * @param deadline - Deadline timestamp string
 * @returns Formatted string like "noch 2 Tage" or "Frist abgelaufen"
 */
export function formatRemainingTime(deadline: string | null): string {
  const remaining = getTimeRemaining(deadline)

  if (remaining.isExpired) {
    return 'Frist abgelaufen'
  }

  if (remaining.days >= 1) {
    return `noch ${remaining.days} Tag${remaining.days === 1 ? '' : 'e'}`
  }

  if (remaining.hours >= 1) {
    return `noch ${remaining.hours} Stunde${remaining.hours === 1 ? '' : 'n'}`
  }

  return `noch ${Math.max(1, remaining.minutes)} Minute${remaining.minutes === 1 ? '' : 'n'}`
}

/**
 * Check if work order needs action and has deadline urgency.
 *
 * @param workOrder - Work order with status and deadline
 * @returns true if work order needs action and deadline is urgent/warning
 */
export function isDeadlineUrgent(workOrder: WorkOrderWithDeadline): boolean {
  // Only check deadline for statuses that need response
  const needsAction = ['sent', 'viewed'].includes(workOrder.status || '')
  if (!needsAction) return false

  const status = getWorkOrderDeadlineStatus(workOrder)
  return status === 'urgent' || status === 'expired'
}

/**
 * Sort work orders by deadline urgency.
 * Expired first, then by remaining time ascending.
 *
 * @param workOrders - Array of work orders
 * @returns Sorted array (does not mutate original)
 */
export function sortByDeadlineUrgency<T extends WorkOrderWithDeadline>(
  workOrders: T[]
): T[] {
  return [...workOrders].sort((a, b) => {
    const aDeadline = a.acceptance_deadline
    const bDeadline = b.acceptance_deadline

    // No deadline sorts to end
    if (!aDeadline && !bDeadline) return 0
    if (!aDeadline) return 1
    if (!bDeadline) return -1

    const aTime = new Date(aDeadline).getTime()
    const bTime = new Date(bDeadline).getTime()

    // Earlier deadline first
    return aTime - bTime
  })
}
