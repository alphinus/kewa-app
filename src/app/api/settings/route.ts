import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

/**
 * Settings response type
 */
interface SettingsResponse {
  settings: Array<{
    key: string
    value: string
    description: string
    updated_at: string
  }>
}

interface ErrorResponse {
  error: string
}

/**
 * GET /api/settings
 *
 * Returns system settings. Only accessible by KEWA role (admin).
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SettingsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only KEWA can access settings
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Query system_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value, description, updated_at')
      .order('key', { ascending: true })

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Parse JSONB values to strings
    const formattedSettings = (settings || []).map(s => ({
      key: s.key,
      value: typeof s.value === 'object' ? JSON.stringify(s.value).replace(/"/g, '') : String(s.value),
      description: s.description || '',
      updated_at: s.updated_at
    }))

    return NextResponse.json({ settings: formattedSettings })
  } catch (error) {
    console.error('Unexpected error in GET /api/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
