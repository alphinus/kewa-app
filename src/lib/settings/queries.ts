/**
 * Settings Query Helpers
 *
 * Server-side query helpers for app_settings key-value store.
 * Settings are admin-configurable (company name, contact info, etc.).
 *
 * Phase 26: Tenant Portal Core
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import type { AppSetting } from '@/types/portal'

// =============================================
// SETTINGS QUERIES
// =============================================

/**
 * Get a single setting value by key
 *
 * @returns Setting value or null if not found
 */
export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return null
  }

  return data.value
}

/**
 * Get all settings as a key-value record
 *
 * Convenient for client-side context providers.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const supabase = await createPublicClient()

  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('key, value')

  if (error || !settings) {
    return {}
  }

  return Object.fromEntries(settings.map((s) => [s.key, s.value]))
}

/**
 * Get all settings with full metadata
 *
 * Used by admin UI for settings management.
 */
export async function getSettingsFull(): Promise<AppSetting[]> {
  const supabase = await createPublicClient()

  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('key', { ascending: true })

  if (error) {
    throw new Error(`Fehler beim Laden der Einstellungen: ${error.message}`)
  }

  return (settings || []) as AppSetting[]
}

/**
 * Update a setting value (admin only)
 *
 * @param key - Setting key to update
 * @param value - New value
 * @param updatedBy - User ID making the change
 */
export async function updateSetting(
  key: string,
  value: string,
  updatedBy: string
): Promise<AppSetting> {
  const supabase = await createPublicClient()

  const { data: setting, error } = await supabase
    .from('app_settings')
    .update({
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single()

  if (error || !setting) {
    throw new Error(`Fehler beim Aktualisieren der Einstellung: ${error?.message}`)
  }

  return setting as AppSetting
}
