/**
 * Ticket Category Admin API
 *
 * PUT /api/settings/categories/:id - Update a category
 * DELETE /api/settings/categories/:id - Soft-delete a category
 *
 * Admin-only routes for managing individual ticket categories.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateCategoryInput } from '@/types/portal'

/**
 * PUT /api/settings/categories/:id
 *
 * Update a ticket category (partial update).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: categoryId } = await params
    const body = await request.json()
    const { display_name, description, sort_order, is_active } =
      body as UpdateCategoryInput

    // Build update object with only provided fields
    const updates: Record<string, string | number | boolean | null> = {}

    if (display_name !== undefined) updates.display_name = display_name
    if (description !== undefined) updates.description = description
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Keine Aktualisierungen angegeben' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('ticket_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Kategorie nicht gefunden' },
          { status: 404 }
        )
      }
      throw new Error(`Fehler beim Aktualisieren der Kategorie: ${error.message}`)
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Aktualisieren der Kategorie',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/categories/:id
 *
 * Soft-delete a category (set is_active = false).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: categoryId } = await params

    const supabase = await createClient()

    const { error } = await supabase
      .from('ticket_categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Kategorie nicht gefunden' },
          { status: 404 }
        )
      }
      throw new Error(`Fehler beim Löschen der Kategorie: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Löschen der Kategorie',
      },
      { status: 500 }
    )
  }
}
