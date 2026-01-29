/**
 * Portal Dashboard API
 *
 * GET /api/portal/dashboard - Get dashboard data for tenant
 *
 * Returns open ticket count, unread message count, recent tickets,
 * unit information, and company name.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getOpenTicketCount,
  getRecentTickets,
} from '@/lib/portal/ticket-queries'
import { getUnreadMessageCount } from '@/lib/portal/message-queries'
import { getTenantContext } from '@/lib/portal/tenant-isolation'
import { getSetting } from '@/lib/settings/queries'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/portal/dashboard
 *
 * Get dashboard data including:
 * - Open ticket count
 * - Unread message count
 * - Recent tickets (last 5)
 * - Unit information
 * - Company name
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    // Get tenant context (unit assignment)
    const tenantContext = await getTenantContext(userId)
    const supabase = await createClient()

    // Fetch unit details
    const { data: unit } = await supabase
      .from('units')
      .select(
        `
        id,
        name,
        building_id,
        floor,
        buildings (
          id,
          name,
          address
        )
      `
      )
      .eq('id', tenantContext.unitId)
      .single()

    // Get dashboard statistics
    const [openTickets, unreadMessages, recentTickets, companyName] =
      await Promise.all([
        getOpenTicketCount(userId),
        getUnreadMessageCount(userId),
        getRecentTickets(userId, 5),
        getSetting('company_name'),
      ])

    return NextResponse.json({
      openTickets,
      unreadMessages,
      recentTickets,
      unit: unit || null,
      companyName: companyName || 'KEWA AG',
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Laden der Dashboard-Daten',
      },
      { status: 500 }
    )
  }
}
