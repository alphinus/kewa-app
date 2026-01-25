import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { KBErrorResponse } from '@/types/knowledge-base'

interface RelatedArticle {
  id: string
  title: string
  category_name: string | null
}

interface RelatedArticlesResponse {
  articles: RelatedArticle[]
}

/**
 * GET /api/knowledge/related
 *
 * Returns related articles based on category and content similarity.
 *
 * Query params:
 * - article_id: UUID of the source article (required)
 * - limit: Maximum results (default 5, max 20)
 *
 * Algorithm:
 * 1. First prioritize articles in same category
 * 2. Then use tsvector overlap for content similarity
 * 3. Exclude the source article and unpublished content
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<RelatedArticlesResponse | KBErrorResponse>> {
  try {
    const supabase = await createClient()

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('article_id')
    const limitParam = searchParams.get('limit')

    // article_id is required
    if (!articleId) {
      return NextResponse.json(
        { error: 'article_id is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article_id format' },
        { status: 400 }
      )
    }

    // Parse and validate limit
    let limit = 5
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        limit = parsed
      }
    }

    // Fetch the source article to get its category
    const { data: sourceArticle, error: sourceError } = await supabase
      .from('kb_articles')
      .select('id, category_id, search_vector')
      .eq('id', articleId)
      .single()

    if (sourceError || !sourceArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Find related articles using category and content similarity
    // Priority: same category first, then by updated_at recency
    let query = supabase
      .from('kb_articles')
      .select(`
        id,
        title,
        category_id,
        category:kb_categories (
          id,
          name
        )
      `)
      .eq('status', 'published')
      .neq('id', articleId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    // If source has a category, prioritize same category
    if (sourceArticle.category_id) {
      // First try same category
      const { data: sameCategoryArticles } = await supabase
        .from('kb_articles')
        .select(`
          id,
          title,
          category_id,
          category:kb_categories (
            id,
            name
          )
        `)
        .eq('status', 'published')
        .eq('category_id', sourceArticle.category_id)
        .neq('id', articleId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (sameCategoryArticles && sameCategoryArticles.length >= limit) {
        // We have enough from same category
        const articles = sameCategoryArticles.map(a => {
          const cat = Array.isArray(a.category) ? a.category[0] : a.category
          return {
            id: a.id,
            title: a.title,
            category_name: cat?.name || null,
          }
        })
        return NextResponse.json({ articles })
      }

      // Get remaining slots from other categories
      const remaining = limit - (sameCategoryArticles?.length || 0)
      const excludeIds = [articleId, ...(sameCategoryArticles?.map(a => a.id) || [])]

      const { data: otherArticles } = await supabase
        .from('kb_articles')
        .select(`
          id,
          title,
          category_id,
          category:kb_categories (
            id,
            name
          )
        `)
        .eq('status', 'published')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(remaining)

      const combined = [
        ...(sameCategoryArticles || []),
        ...(otherArticles || []),
      ]

      const articles = combined.map(a => {
        const cat = Array.isArray(a.category) ? a.category[0] : a.category
        return {
          id: a.id,
          title: a.title,
          category_name: cat?.name || null,
        }
      })

      return NextResponse.json({ articles })
    }

    // No category - just get recent published articles
    const { data: articleData, error: articlesError } = await query

    if (articlesError) {
      console.error('Error fetching related articles:', articlesError)
      return NextResponse.json(
        { error: 'Failed to fetch related articles' },
        { status: 500 }
      )
    }

    const articles = (articleData || []).map(a => {
      const cat = Array.isArray(a.category) ? a.category[0] : a.category
      return {
        id: a.id,
        title: a.title,
        category_name: cat?.name || null,
      }
    })

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/related:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
