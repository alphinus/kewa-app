import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  KBArticleWithMeta,
  KBArticlesResponse,
  KBArticleResponse,
  CreateKBArticleInput,
  KBErrorResponse,
  KBArticle,
  KBArticleStatus,
  KBArticleVisibility,
} from '@/types/knowledge-base'

/**
 * GET /api/knowledge
 *
 * Returns all articles with author and category info.
 * Supports query params: ?status=draft|review|published|archived, ?category_id=uuid, ?visibility=internal|contractors|both
 *
 * Sorted by: updated_at DESC (most recent first)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<KBArticlesResponse | KBErrorResponse>> {
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
    const statusFilter = searchParams.get('status') as KBArticleStatus | null
    const categoryIdFilter = searchParams.get('category_id')
    const visibilityFilter = searchParams.get('visibility') as KBArticleVisibility | null

    // Build query for articles with author and category info
    let query = supabase
      .from('kb_articles')
      .select(`
        *,
        author:users!kb_articles_author_id_fkey (
          id,
          display_name
        ),
        category:kb_categories (
          id,
          name
        )
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (categoryIdFilter) {
      query = query.eq('category_id', categoryIdFilter)
    }

    if (visibilityFilter) {
      query = query.eq('visibility', visibilityFilter)
    }

    const { data: articles, error: articlesError } = await query

    if (articlesError) {
      console.error('Error fetching articles:', articlesError)
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      )
    }

    // Transform to KBArticleWithMeta
    const transformedArticles: KBArticleWithMeta[] = (articles || []).map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      template: article.template,
      status: article.status,
      visibility: article.visibility,
      category_id: article.category_id,
      tags: article.tags || [],
      author_id: article.author_id,
      last_reviewed_at: article.last_reviewed_at,
      expiry_date: article.expiry_date,
      view_count: article.view_count,
      version: article.version,
      created_at: article.created_at,
      updated_at: article.updated_at,
      updated_by: article.updated_by,
      author_name: article.author?.display_name || 'Unknown',
      category_name: article.category?.name || null,
    }))

    return NextResponse.json({ articles: transformedArticles })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge
 *
 * Creates a new article.
 * Accepts: { title, content, template, category_id?, tags?, visibility? }
 * Defaults: status='draft', visibility='internal'
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<KBArticleResponse | KBErrorResponse>> {
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

    // Parse request body
    const body: CreateKBArticleInput = await request.json()

    // Validate required fields
    if (!body.title || !body.content || !body.template) {
      return NextResponse.json(
        { error: 'title, content, and template are required' },
        { status: 400 }
      )
    }

    // Validate template value
    if (!['faq', 'howto', 'policy'].includes(body.template)) {
      return NextResponse.json(
        { error: 'template must be one of: faq, howto, policy' },
        { status: 400 }
      )
    }

    // Verify category exists if provided
    if (body.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('kb_categories')
        .select('id')
        .eq('id', body.category_id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }

    // Create article with defaults
    const articleData: Partial<KBArticle> = {
      title: body.title.trim(),
      content: body.content,
      template: body.template,
      status: 'draft',
      visibility: body.visibility || 'internal',
      category_id: body.category_id || null,
      tags: body.tags || [],
      author_id: userId,
      updated_by: userId,
    }

    const { data: newArticle, error: createError } = await supabase
      .from('kb_articles')
      .insert(articleData)
      .select(`
        *,
        author:users!kb_articles_author_id_fkey (
          id,
          display_name
        ),
        category:kb_categories (
          id,
          name
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating article:', createError)
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      )
    }

    // Transform to KBArticleWithMeta
    const transformedArticle: KBArticleWithMeta = {
      id: newArticle.id,
      title: newArticle.title,
      content: newArticle.content,
      template: newArticle.template,
      status: newArticle.status,
      visibility: newArticle.visibility,
      category_id: newArticle.category_id,
      tags: newArticle.tags || [],
      author_id: newArticle.author_id,
      last_reviewed_at: newArticle.last_reviewed_at,
      expiry_date: newArticle.expiry_date,
      view_count: newArticle.view_count,
      version: newArticle.version,
      created_at: newArticle.created_at,
      updated_at: newArticle.updated_at,
      updated_by: newArticle.updated_by,
      author_name: newArticle.author?.display_name || 'Unknown',
      category_name: newArticle.category?.name || null,
    }

    return NextResponse.json({ article: transformedArticle }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/knowledge:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
