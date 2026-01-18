/**
 * Audit Logging Utilities
 *
 * Provides functions for logging authentication and data change events
 * to the audit_logs table.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Authentication audit event types
 */
export type AuthAuditAction =
  | 'auth.login.pin.success'
  | 'auth.login.pin.failure'
  | 'auth.login.email.success'
  | 'auth.login.email.failure'
  | 'auth.login.magic_link.success'
  | 'auth.login.magic_link.failure'
  | 'auth.login.magic_link.expired'
  | 'auth.logout'
  | 'auth.session.created'
  | 'auth.session.expired'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'auth.magic_link.sent'
  | 'auth.magic_link.revoked'

/**
 * Options for creating an auth audit log entry
 */
export interface AuthAuditLogOptions {
  action: AuthAuditAction
  userId: string | null
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
}

/**
 * Create an authentication audit log entry
 *
 * Uses the 'auth' table name to distinguish from data change logs.
 */
export async function createAuthAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: AuthAuditLogOptions
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'auth',
      record_id: options.userId || '00000000-0000-0000-0000-000000000000',
      action: 'create', // Using 'create' from audit_action enum for auth events
      user_id: options.userId,
      user_role: null, // Role determined by action type
      old_values: null,
      new_values: {
        event: options.action,
        ...options.details
      },
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break auth flow
    console.error('Failed to create auth audit log:', error)
  }
}

/**
 * Data change audit action types (from audit_action enum)
 */
export type DataAuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore'

/**
 * Options for creating a data audit log entry
 */
export interface DataAuditLogOptions {
  tableName: string
  recordId: string
  action: DataAuditAction
  userId: string | null
  userRole?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
}

/**
 * Create a data change audit log entry
 */
export async function createDataAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: DataAuditLogOptions
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: options.tableName,
        record_id: options.recordId,
        action: options.action,
        user_id: options.userId,
        user_role: options.userRole || null,
        old_values: options.oldValues || null,
        new_values: options.newValues || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create data audit log:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Failed to create data audit log:', error)
    return null
  }
}

/**
 * Get audit history for a specific record
 */
export async function getRecordAuditHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableName: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get audit history:', error)
    return []
  }

  return data
}

/**
 * Get recent auth events for a user
 */
export async function getUserAuthHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('table_name', 'auth')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get user auth history:', error)
    return []
  }

  return data
}

/**
 * Get failed login attempts in a time window (for security monitoring)
 */
export async function getFailedLoginAttempts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ipAddress: string,
  windowMinutes = 15
): Promise<number> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('table_name', 'auth')
    .eq('ip_address', ipAddress)
    .gte('created_at', windowStart)
    .or('new_values->>event.eq.auth.login.pin.failure,new_values->>event.eq.auth.login.email.failure,new_values->>event.eq.auth.login.magic_link.failure')

  if (error) {
    console.error('Failed to get failed login attempts:', error)
    return 0
  }

  return count || 0
}
