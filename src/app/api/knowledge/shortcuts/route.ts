import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { KBShortcutsResponse, KBErrorResponse } from '@/types/knowledge-base'

/**
 * GET /api/knowledge/shortcuts
 *
 * Returns the current user's pinned article shortcuts.
 * Includes article title for display.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<KBShortcutsResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user's shortcuts with article info
    const { data: shortcutsData, error: shortcutsError } = await supabase
      .from('kb_dashboard_shortcuts')
      .select(`
        id,
        user_id,
        article_id,
        created_at,
        article:kb_articles (
          id,
          title,
          category_id,
          category:kb_categories (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (shortcutsError) {
      console.error('Error fetching shortcuts:', shortcutsError)
      return NextResponse.json(
        { error: 'Failed to fetch shortcuts' },
        { status: 500 }
      )
    }

    // Transform to include flattened article info
    const shortcuts = (shortcutsData || []).map(s => {
      const articleData = Array.isArray(s.article) ? s.article[0] : s.article
      const categoryData = articleData?.category
      const cat = Array.isArray(categoryData) ? categoryData[0] : categoryData
      return {
        id: s.id,
        user_id: s.user_id,
        article_id: s.article_id,
        created_at: s.created_at,
        article: articleData ? {
          id: articleData.id,
          title: articleData.title,
          category_id: articleData.category_id,
          category_name: cat?.name || null,
        } : undefined,
      }
    })

    return NextResponse.json({ shortcuts })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/shortcuts:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
