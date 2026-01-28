/**
 * Change Order Threshold Routing
 *
 * Determines approval routing based on configurable thresholds.
 * Queries approval_thresholds table with project-specific fallback to global.
 *
 * Phase 21-02: Approval Workflow
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================

/**
 * Approval route result from threshold matching
 */
export interface ApprovalRoute {
  approver_role: string
  requires_client_approval: boolean
}

// ============================================
// THRESHOLD ROUTING
// ============================================

/**
 * Determine approver based on change order amount and project
 *
 * Algorithm:
 * 1. Query approval_thresholds table
 * 2. First try project-specific thresholds (project_id = X)
 * 3. If none found, use global defaults (project_id IS NULL)
 * 4. Match based on amount range (min_amount <= amount < max_amount)
 * 5. Order by priority ASC, take first match
 *
 * @param changeOrderId - Change order ID (for logging/audit)
 * @param totalAmount - CO total amount in CHF
 * @param projectId - Project ID (optional, for project-specific thresholds)
 * @param supabase - Supabase client
 * @returns Approval route with approver role and client approval flag
 */
export async function determineApprover(
  changeOrderId: string,
  totalAmount: number,
  projectId: string | null | undefined,
  supabase: SupabaseClient
): Promise<ApprovalRoute> {
  // First try project-specific thresholds if project exists
  if (projectId) {
    const { data: projectThreshold } = await supabase
      .from('approval_thresholds')
      .select('approver_role, requires_client_approval')
      .eq('project_id', projectId)
      .or(
        `and(min_amount.is.null,max_amount.is.null),` +
        `and(min_amount.is.null,max_amount.gt.${totalAmount}),` +
        `and(min_amount.lte.${totalAmount},max_amount.is.null),` +
        `and(min_amount.lte.${totalAmount},max_amount.gt.${totalAmount})`
      )
      .order('priority', { ascending: true })
      .limit(1)
      .single()

    if (projectThreshold) {
      return {
        approver_role: projectThreshold.approver_role,
        requires_client_approval: projectThreshold.requires_client_approval,
      }
    }
  }

  // Fallback to global thresholds (project_id IS NULL)
  const { data: globalThreshold, error } = await supabase
    .from('approval_thresholds')
    .select('approver_role, requires_client_approval')
    .is('project_id', null)
    .or(
      `and(min_amount.is.null,max_amount.is.null),` +
      `and(min_amount.is.null,max_amount.gt.${totalAmount}),` +
      `and(min_amount.lte.${totalAmount},max_amount.is.null),` +
      `and(min_amount.lte.${totalAmount},max_amount.gt.${totalAmount})`
    )
    .order('priority', { ascending: true })
    .limit(1)
    .single()

  if (error || !globalThreshold) {
    // No threshold found - default to property_manager
    console.warn(
      `No approval threshold found for CO ${changeOrderId}, amount ${totalAmount} CHF. Using default property_manager.`
    )
    return {
      approver_role: 'property_manager',
      requires_client_approval: false,
    }
  }

  return {
    approver_role: globalThreshold.approver_role,
    requires_client_approval: globalThreshold.requires_client_approval,
  }
}
