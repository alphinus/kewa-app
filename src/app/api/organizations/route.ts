/**
 * Organizations API - Collection Route
 *
 * GET /api/organizations - List available organizations for the authenticated user
 *
 * Phase 38: App Context & Org Switcher — data layer for OrganizationProvider
 *
 * Uses createPublicClient: organizations and organization_members have NO RLS.
 * Org scoping is handled at query level (user_id = x-user-id header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/with-org'

/**
 * GET /api/organizations - Returns available organizations for the current user
 *
 * Reads x-user-id header (set by middleware) to identify the user.
 * Returns only organizations where is_active = true.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      is_default,
      organizations (
        id,
        name,
        slug,
        is_active
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const organizations = (data || [])
    .filter((m: any) => m.organizations?.is_active)
    .map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      slug: m.organizations.slug,
      isDefault: m.is_default,
    }))

  return NextResponse.json({ organizations })
}
