/**
 * Settings API
 *
 * GET /api/settings - List all app settings
 * PUT /api/settings - Update a setting value
 *
 * Admin-only routes for managing app_settings (company name, contact info, etc.).
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSettingsFull, updateSetting } from '@/lib/settings/queries'
import type { UpdateSettingInput } from '@/types/portal'

/**
 * GET /api/settings
 *
 * Get all settings with full metadata (admin view).
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const roleName = request.headers.get('x-user-role-name')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Verify admin role
  if (roleName !== 'admin' && roleName !== 'property_manager') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  try {
    const settings = await getSettingsFull()

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Laden der Einstellungen',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 *
 * Update a single setting value.
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const roleName = request.headers.get('x-user-role-name')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Verify admin role
  if (roleName !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { key, value } = body

    // Validate input
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Einstellungs-Key erforderlich' },
        { status: 400 }
      )
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Wert erforderlich' },
        { status: 400 }
      )
    }

    const setting = await updateSetting(key, String(value), userId)

    return NextResponse.json({ setting })
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Aktualisieren der Einstellung',
      },
      { status: 500 }
    )
  }
}
