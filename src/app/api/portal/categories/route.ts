/**
 * Portal Categories API
 *
 * GET /api/portal/categories - List active ticket categories
 *
 * Public endpoint for portal (no auth required for category list).
 * Phase 26: Tenant Portal Core
 */

import { NextResponse } from 'next/server'
import { getTicketCategories } from '@/lib/portal/ticket-queries'

/**
 * GET /api/portal/categories
 *
 * Get all active ticket categories for display in portal.
 */
export async function GET() {
  try {
    const categories = await getTicketCategories()

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden der Kategorien' },
      { status: 500 }
    )
  }
}
