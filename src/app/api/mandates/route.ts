/**
 * Mandates API - Collection Route
 *
 * GET /api/mandates - List mandates for the current organization
 *
 * Phase 38: App Context & Org Switcher — data layer for MandateProvider
 *
 * Uses createPublicClient: mandates table has NO RLS.
 * Org scoping is handled at query level (organization_id = x-organization-id header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/with-org'

/**
 * GET /api/mandates - Returns active mandates for the current organization
 *
 * Reads x-organization-id header (set by middleware) for org scoping.
 * Returns only mandates where is_active = true, ordered by name.
 */
export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')
  if (!orgId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
  }

  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('mandates')
    .select('id, name, mandate_type, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching mandates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mandates: data || [] })
}
