/**
 * Ticket Categories Admin API
 *
 * GET /api/settings/categories - List all categories (including inactive)
 * POST /api/settings/categories - Create a new category
 *
 * Admin-only routes for managing ticket categories.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/with-org'
import type { CreateCategoryInput } from '@/types/portal'

/**
 * GET /api/settings/categories
 *
 * Get all ticket categories (including inactive) for admin management.
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
    const supabase = await createPublicClient()

    const { data: categories, error } = await supabase
      .from('ticket_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw new Error(`Fehler beim Laden der Kategorien: ${error.message}`)
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Laden der Kategorien',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/categories
 *
 * Create a new ticket category.
 */
export async function POST(request: NextRequest) {
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
    const { name, display_name, description, sort_order } =
      body as CreateCategoryInput

    // Validate required fields
    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'Name und Anzeigename sind erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createPublicClient()

    // Get max sort_order to append at end
    const { data: maxCategory } = await supabase
      .from('ticket_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder =
      sort_order !== undefined ? sort_order : (maxCategory?.sort_order || 0) + 1

    const { data: category, error } = await supabase
      .from('ticket_categories')
      .insert({
        name,
        display_name,
        description: description || null,
        sort_order: nextSortOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Fehler beim Erstellen der Kategorie: ${error.message}`)
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Erstellen der Kategorie',
      },
      { status: 500 }
    )
  }
}
