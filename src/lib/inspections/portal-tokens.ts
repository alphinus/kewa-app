/**
 * Inspection Portal Token Utilities
 *
 * Token creation and validation for contractor inspection portal access.
 * Uses existing magic_link_tokens infrastructure with inspection-specific join table.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Create a magic link token for inspection portal access
 *
 * Creates token via existing RPC and links to inspection via join table.
 *
 * @param inspectionId Inspection to grant access to
 * @param contractorEmail Email for token association
 * @param expiryHours Token validity (default 7 days)
 * @returns Token string for portal URL
 */
export async function createInspectionPortalToken(
  inspectionId: string,
  contractorEmail: string,
  expiryHours: number = 168 // 7 days default
): Promise<string> {
  const supabase = await createClient()

  // Use existing magic link token RPC
  const { data: token, error: tokenError } = await supabase.rpc('create_magic_link_token', {
    p_email: contractorEmail,
    p_purpose: 'inspection_acknowledgment',
    p_expires_hours: expiryHours,
  })

  if (tokenError) throw tokenError

  // Link token to inspection via junction table
  const { error: linkError } = await supabase
    .from('inspection_portal_tokens')
    .insert({
      token,
      inspection_id: inspectionId,
    })

  if (linkError) throw linkError

  return token
}

/**
 * Validate inspection portal token (read-only check)
 *
 * Returns inspection ID and email if token is valid.
 * Does NOT consume the token - use consumeInspectionPortalToken for that.
 *
 * @param token Token from portal URL
 * @returns Validation result with inspection ID if valid
 */
export async function validateInspectionPortalToken(token: string): Promise<{
  valid: boolean
  inspectionId?: string
  email?: string
}> {
  const supabase = await createClient()

  // Validate token (read-only, DO NOT consume)
  const { data: tokenData } = await supabase
    .from('magic_link_tokens')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .eq('purpose', 'inspection_acknowledgment')
    .single()

  if (!tokenData) return { valid: false }

  // Get linked inspection
  const { data: portalToken } = await supabase
    .from('inspection_portal_tokens')
    .select('inspection_id')
    .eq('token', token)
    .single()

  if (!portalToken) return { valid: false }

  return {
    valid: true,
    inspectionId: portalToken.inspection_id,
    email: tokenData.email,
  }
}

/**
 * Consume inspection portal token
 *
 * Marks token as used to prevent reuse after acknowledgment.
 *
 * @param token Token to consume
 * @returns True if consumed successfully
 */
export async function consumeInspectionPortalToken(token: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('magic_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)

  return !error
}
