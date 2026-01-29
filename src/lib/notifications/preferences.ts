/**
 * Notification Preferences
 *
 * Functions for managing user notification preferences.
 * Phase: 24-push-notifications
 */

import { createClient } from '@/lib/supabase/server'
import type {
  NotificationPreferences,
  UpdatePreferencesInput,
  NotificationType,
} from '@/types/notifications'
import { ROLE_NOTIFICATION_TYPES } from '@/types/notifications'

// =============================================
// PREFERENCE QUERIES
// =============================================

/**
 * Get notification preferences for a user
 * Returns defaults if no preferences exist (does not auto-insert)
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  // Return defaults if no row exists
  if (!data) {
    return {
      user_id: userId,
      work_order_status_enabled: true,
      approval_needed_enabled: true,
      deadline_reminder_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'Europe/Zurich',
      digest_enabled: false,
      digest_time: '08:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return data as NotificationPreferences
}

/**
 * Create or update notification preferences
 * UPSERT pattern: creates row on first save, updates on subsequent saves
 */
export async function upsertPreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<NotificationPreferences> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single()

  if (error) throw error

  return data as NotificationPreferences
}

/**
 * Get available notification types for a role
 * Used by UI to filter which preference toggles to show
 */
export function getAvailableTypes(roleName: string): NotificationType[] {
  return ROLE_NOTIFICATION_TYPES[roleName] || []
}

/**
 * Check if a notification type is enabled for user
 * Maps NotificationType to the corresponding boolean field
 */
export function isTypeEnabledForUser(
  preferences: NotificationPreferences,
  type: NotificationType
): boolean {
  const fieldMap: Record<NotificationType, keyof NotificationPreferences> = {
    work_order_status: 'work_order_status_enabled',
    approval_needed: 'approval_needed_enabled',
    deadline_reminder: 'deadline_reminder_enabled',
  }

  const field = fieldMap[type]
  return preferences[field] as boolean
}

/**
 * Check if current time is within user's quiet hours
 * Handles overnight wrap (e.g., 22:00 start, 08:00 end)
 */
export function isWithinQuietHours(preferences: NotificationPreferences): boolean {
  const now = new Date()

  // Convert to user's timezone
  const timeInUserTZ = now.toLocaleString('en-US', {
    timeZone: preferences.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  // Extract HH:MM from "HH:MM:SS" or "HH:MM"
  const currentTime = timeInUserTZ.split(',').pop()?.trim().slice(0, 5) || '00:00'

  const start = preferences.quiet_hours_start
  const end = preferences.quiet_hours_end

  // Check if quiet hours wrap overnight (e.g., 22:00 to 08:00)
  if (start > end) {
    // Quiet hours span midnight: quiet from start to 23:59, then 00:00 to end
    return currentTime >= start || currentTime < end
  } else {
    // Normal range: quiet from start to end
    return currentTime >= start && currentTime < end
  }
}
