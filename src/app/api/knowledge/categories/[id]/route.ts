import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  KBCategoryResponse,
  KBArticleWithMeta,
  UpdateKBCategoryInput,
  KBErrorResponse,
  KBSuccessResponse,
} from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * Response type for single category with articles
 */
interface KBCategoryDetailResponse {
  category: {
    id: string
    name: string
    description: string | null
    icon: string | null
    parent_id: string | null
    parent_name: string | null
    path: string
    level: number
  }
  articles: KBArticleWithMeta[]
}

/**
 * GET /api/knowledge/categories/[id]
 *
 * Returns a single category with its articles.
 * Only shows published articles for non-admin users.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBCategoryDetailResponse | KBErrorResponse>> {
  try {
    const supabase = await createClient()
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
        { error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    // Fetch category with parent info
    const { data: category, error: categoryError } = await supabase
      .from('kb_categories')
      .select(`
        id,
        name,
        description,
        icon,
        parent_id,
        path,
        level
      `)
      .eq('id', id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Fetch parent name if exists
    let parentName: string | null = null
    if (category.parent_id) {
      const { data: parent } = await supabase
        .from('kb_categories')
        .select('name')
        .eq('id', category.parent_id)
        .single()
      parentName = parent?.name || null
    }

    // Fetch articles in this category
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    let articlesQuery = supabase
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
      .eq('category_id', id)
      .order('updated_at', { ascending: false })

    // Non-admin users only see published articles
    if (!isAdmin) {
      articlesQuery = articlesQuery.eq('status', 'published')
    }

    const { data: articles, error: articlesError } = await articlesQuery

    if (articlesError) {
      console.error('Error fetching category articles:', articlesError)
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      )
    }

    // Transform articles to KBArticleWithMeta
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

    return NextResponse.json({
      category: {
        ...category,
        parent_name: parentName,
      },
      articles: transformedArticles,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/categories/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/knowledge/categories/[id]
 *
 * Updates an existing category. Admin only.
 * Accepts: { name?, description?, icon?, sort_order? }
 * Note: parent_id cannot be changed after creation.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBCategoryResponse | KBErrorResponse>> {
  try {
    const supabase = await createClient()
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

    // Admin only
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can update categories' },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: UpdateKBCategoryInput = await request.json()

    // Verify category exists
    const { data: existing, error: fetchError } = await supabase
      .from('kb_categories')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }
    if (body.icon !== undefined) {
      updateData.icon = body.icon || null
    }
    if (body.sort_order !== undefined) {
      updateData.sort_order = body.sort_order
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update category
    const { data: updated, error: updateError } = await supabase
      .from('kb_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating category:', updateError)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category: updated })
  } catch (error) {
    console.error('Unexpected error in PUT /api/knowledge/categories/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/categories/[id]
 *
 * Deletes a category. Admin only.
 * Only allowed if category has no articles (to prevent orphans).
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBSuccessResponse | KBErrorResponse>> {
  try {
    const supabase = await createClient()
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

    // Admin only
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete categories' },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    // Verify category exists
    const { data: category, error: fetchError } = await supabase
      .from('kb_categories')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category has articles
    const { count: articleCount, error: countError } = await supabase
      .from('kb_articles')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if (countError) {
      console.error('Error checking category articles:', countError)
      return NextResponse.json(
        { error: 'Failed to check category articles' },
        { status: 500 }
      )
    }

    if (articleCount && articleCount > 0) {
      return NextResponse.json(
        { error: `Kategorie "${category.name}" enthalt noch ${articleCount} Artikel. Verschieben oder loeschen Sie diese zuerst.` },
        { status: 400 }
      )
    }

    // Check if category has children
    const { count: childCount, error: childError } = await supabase
      .from('kb_categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id)

    if (childError) {
      console.error('Error checking category children:', childError)
      return NextResponse.json(
        { error: 'Failed to check subcategories' },
        { status: 500 }
      )
    }

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: `Kategorie "${category.name}" hat noch ${childCount} Unterkategorien. Loeschen Sie diese zuerst.` },
        { status: 400 }
      )
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('kb_categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting category:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/knowledge/categories/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
