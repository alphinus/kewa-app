/**
 * Tenant Isolation Helper
 *
 * Ensures all tenant queries are scoped by user_id from session.
 * Prevents cross-tenant data access at the application layer.
 *
 * Phase 26: Tenant Portal Core
 */

import { createServiceClient } from '@/lib/supabase/with-org'
import type { Ticket } from '@/types/portal'

// =============================================
// TENANT CONTEXT
// =============================================

/**
 * Tenant context derived from database
 */
export interface TenantContext {
  userId: string
  unitId: string
  isPrimary: boolean
}

/**
 * Get tenant context (unit assignment) for a user
 *
 * @throws Error if user is not linked to an active unit
 */
export async function getTenantContext(userId: string): Promise<TenantContext> {
  const supabase = createServiceClient()

  const { data: tenantUser, error } = await supabase
    .from('tenant_users')
    .select('unit_id, is_primary')
    .eq('user_id', userId)
    .is('move_out_date', null) // Active tenants only
    .single()

  if (error || !tenantUser) {
    throw new Error('Mieter ist keiner Einheit zugeordnet')
  }

  return {
    userId,
    unitId: tenantUser.unit_id,
    isPrimary: tenantUser.is_primary,
  }
}

/**
 * Verify ticket ownership (created_by matches userId)
 *
 * @throws Error if ticket not found or not owned by user
 * @returns Ticket record if ownership verified
 */
export async function verifyTicketOwnership(
  userId: string,
  ticketId: string
): Promise<Ticket> {
  const supabase = createServiceClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('created_by', userId)
    .single()

  if (error || !ticket) {
    throw new Error('Ticket nicht gefunden oder Zugriff verweigert')
  }

  return ticket as Ticket
}
