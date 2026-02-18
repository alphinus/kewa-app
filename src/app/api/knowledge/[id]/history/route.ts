import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { KBArticleHistoryResponse, KBErrorResponse } from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/[id]/history
 *
 * Returns version history for an article.
 * Joins with users table for changed_by_name.
 * Ordered by version DESC (most recent first).
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBArticleHistoryResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id } = await params

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
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('id', id)
      .single()

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Fetch history with user names
    const { data: historyData, error: historyError } = await supabase
      .from('kb_articles_history')
      .select(`
        *,
        changed_by_user:users!kb_articles_history_changed_by_fkey (
          id,
          display_name
        )
      `)
      .eq('article_id', id)
      .order('version', { ascending: false })

    if (historyError) {
      console.error('Error fetching article history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch article history' },
        { status: 500 }
      )
    }

    // Transform to include changed_by_name
    const history = (historyData || []).map(entry => ({
      history_id: entry.history_id,
      article_id: entry.article_id,
      version: entry.version,
      title: entry.title,
      content: entry.content,
      status: entry.status,
      changed_at: entry.changed_at,
      changed_by: entry.changed_by,
      change_type: entry.change_type,
      changed_by_name: entry.changed_by_user?.display_name || 'Unknown',
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/[id]/history:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
