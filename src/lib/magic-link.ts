/**
 * Magic Link Token Utilities
 *
 * Token-based authentication for external contractors.
 * Implements NFR-05: Token-based external access with expiry.
 *
 * Workflow:
 * 1. Create magic link when sending work order
 * 2. Contractor receives email with link
 * 3. Link validates token and creates session
 * 4. Token marked as used (single-use by default)
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface MagicLinkConfig {
  /** Hours until token expires (default: 72) */
  expiryHours: number
  /** Mark as used after first access (default: true) */
  singleUse: boolean
  /** Purpose identifier for the token */
  purpose: 'work_order_access' | 'login' | 'password_reset'
}

export interface CreateMagicLinkResult {
  token: string
  url: string
  expiresAt: Date
}

export interface VerifyMagicLinkResult {
  valid: boolean
  workOrderId?: string
  email?: string
  userId?: string
  error?: 'expired' | 'used' | 'revoked' | 'not_found'
}

interface MagicLinkToken {
  id: string
  token: string
  user_id: string | null
  work_order_id: string | null
  email: string
  purpose: string
  expires_at: string
  used_at: string | null
  is_revoked: boolean
  created_at: string
  created_by: string | null
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG: MagicLinkConfig = {
  expiryHours: 72,
  singleUse: true,
  purpose: 'work_order_access'
}

/**
 * Get expiry hours from system settings
 */
async function getExpiryHoursFromSettings(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'magic_link_expiry_hours')
      .single()

    if (data?.value) {
      const hours = parseInt(String(data.value), 10)
      if (!isNaN(hours) && hours > 0) {
        return hours
      }
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_CONFIG.expiryHours
}

// ============================================
// CREATE MAGIC LINK
// ============================================

/**
 * Create a magic link token for contractor access to a work order.
 *
 * @param workOrderId - UUID of the work order
 * @param email - Contractor's email address
 * @param config - Optional configuration overrides
 * @param createdBy - User ID who created the token (optional)
 * @returns Token, URL, and expiry date
 */
export async function createMagicLink(
  workOrderId: string,
  email: string,
  config?: Partial<MagicLinkConfig>,
  createdBy?: string
): Promise<CreateMagicLinkResult> {
  const supabase = await createClient()

  // Get expiry hours from settings or config
  const expiryHours = config?.expiryHours ?? await getExpiryHoursFromSettings()
  const purpose = config?.purpose ?? DEFAULT_CONFIG.purpose

  // Calculate expiry
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiryHours)

  // Insert token
  const { data, error } = await supabase
    .from('magic_link_tokens')
    .insert({
      work_order_id: workOrderId,
      email: email.toLowerCase(),
      purpose,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy ?? null
    })
    .select('token')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create magic link: ${error?.message ?? 'Unknown error'}`)
  }

  // Build URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/contractor/${data.token}`

  return {
    token: data.token,
    url,
    expiresAt
  }
}

// ============================================
// VERIFY MAGIC LINK
// ============================================

/**
 * Verify a magic link token and return associated data.
 *
 * @param token - The token from the URL
 * @param markAsUsed - Whether to mark the token as used (default: true for single-use)
 * @returns Verification result with work order ID and email
 */
export async function verifyMagicLink(
  token: string,
  markAsUsed = true
): Promise<VerifyMagicLinkResult> {
  const supabase = await createClient()

  // Find token
  const { data, error } = await supabase
    .from('magic_link_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { valid: false, error: 'not_found' }
  }

  const tokenData = data as MagicLinkToken

  // Check if revoked
  if (tokenData.is_revoked) {
    return { valid: false, error: 'revoked' }
  }

  // Check if expired
  const expiresAt = new Date(tokenData.expires_at)
  if (expiresAt < new Date()) {
    return { valid: false, error: 'expired' }
  }

  // Check if already used (only if single-use)
  if (tokenData.used_at !== null) {
    return { valid: false, error: 'used' }
  }

  // Mark as used if requested
  if (markAsUsed) {
    await supabase
      .from('magic_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
  }

  return {
    valid: true,
    workOrderId: tokenData.work_order_id ?? undefined,
    email: tokenData.email,
    userId: tokenData.user_id ?? undefined
  }
}

// ============================================
// PEEK MAGIC LINK (without marking as used)
// ============================================

/**
 * Check if a magic link is valid without consuming it.
 * Useful for pre-validation before rendering the contractor portal.
 *
 * @param token - The token from the URL
 * @returns Verification result (never marks as used)
 */
export async function peekMagicLink(token: string): Promise<VerifyMagicLinkResult> {
  return verifyMagicLink(token, false)
}

// ============================================
// REVOKE MAGIC LINK
// ============================================

/**
 * Revoke a magic link token.
 * Revoked tokens cannot be used even if not expired.
 *
 * @param token - The token to revoke
 */
export async function revokeMagicLink(token: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('magic_link_tokens')
    .update({ is_revoked: true })
    .eq('token', token)

  if (error) {
    throw new Error(`Failed to revoke magic link: ${error.message}`)
  }
}

/**
 * Revoke all magic links for a work order.
 * Use when work order is cancelled or contractor changes.
 *
 * @param workOrderId - UUID of the work order
 */
export async function revokeAllForWorkOrder(workOrderId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('magic_link_tokens')
    .update({ is_revoked: true })
    .eq('work_order_id', workOrderId)
    .eq('is_revoked', false)

  if (error) {
    throw new Error(`Failed to revoke magic links: ${error.message}`)
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get active tokens for a work order.
 * Useful for checking if contractor already has access.
 */
export async function getActiveTokensForWorkOrder(workOrderId: string): Promise<{
  count: number
  latestExpiry: Date | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('magic_link_tokens')
    .select('expires_at')
    .eq('work_order_id', workOrderId)
    .eq('is_revoked', false)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())

  if (error || !data) {
    return { count: 0, latestExpiry: null }
  }

  const count = data.length
  const latestExpiry = count > 0
    ? new Date(Math.max(...data.map((t: { expires_at: string }) => new Date(t.expires_at).getTime())))
    : null

  return { count, latestExpiry }
}

/**
 * Generate contractor portal URL for a work order.
 * Creates a new token if no active token exists.
 */
export async function getOrCreateContractorUrl(
  workOrderId: string,
  email: string,
  createdBy?: string
): Promise<CreateMagicLinkResult> {
  // Check for existing active token
  const active = await getActiveTokensForWorkOrder(workOrderId)

  if (active.count > 0 && active.latestExpiry) {
    // Return existing (we don't have the URL, but can reconstruct it)
    const supabase = await createClient()
    const { data } = await supabase
      .from('magic_link_tokens')
      .select('token')
      .eq('work_order_id', workOrderId)
      .eq('is_revoked', false)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      return {
        token: data.token,
        url: `${baseUrl}/contractor/${data.token}`,
        expiresAt: active.latestExpiry
      }
    }
  }

  // Create new token
  return createMagicLink(workOrderId, email, undefined, createdBy)
}

/**
 * Check if token is close to expiry (within 24 hours).
 * Useful for showing warnings in the UI.
 */
export async function isTokenExpiringSoon(token: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('magic_link_tokens')
    .select('expires_at')
    .eq('token', token)
    .single()

  if (!data?.expires_at) return false

  const expiresAt = new Date(data.expires_at)
  const hoursRemaining = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)

  return hoursRemaining > 0 && hoursRemaining < 24
}
