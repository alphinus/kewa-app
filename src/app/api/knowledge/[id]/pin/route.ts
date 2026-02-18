import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { KBDashboardShortcut, KBErrorResponse, KBSuccessResponse } from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

interface PinResponse {
  shortcut: KBDashboardShortcut
}

/**
 * POST /api/knowledge/[id]/pin
 *
 * Pins an article to the user's dashboard shortcuts.
 * Creates a kb_dashboard_shortcuts record.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PinResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id: articleId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Check if already pinned
    const { data: existing } = await supabase
      .from('kb_dashboard_shortcuts')
      .select('id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Article already pinned' },
        { status: 409 }
      )
    }

    // Create shortcut
    const { data: shortcut, error: createError } = await supabase
      .from('kb_dashboard_shortcuts')
      .insert({
        user_id: userId,
        article_id: articleId,
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating shortcut:', createError)
      return NextResponse.json(
        { error: 'Failed to pin article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ shortcut }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/knowledge/[id]/pin:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/[id]/pin
 *
 * Removes an article from the user's dashboard shortcuts.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBSuccessResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id: articleId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Delete shortcut
    const { error: deleteError } = await supabase
      .from('kb_dashboard_shortcuts')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', articleId)

    if (deleteError) {
      console.error('Error deleting shortcut:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unpin article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/knowledge/[id]/pin:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
