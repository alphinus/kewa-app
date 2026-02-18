import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type {
  KBCategoryWithCount,
  KBCategoriesResponse,
  KBCategoryResponse,
  CreateKBCategoryInput,
  KBErrorResponse,
  KBCategory,
} from '@/types/knowledge-base'

/**
 * GET /api/knowledge/categories
 *
 * Returns all categories as a tree structure with article counts.
 * Query params: ?include_empty=true (for admin to see empty categories)
 *
 * Structure: Top-level categories contain children array with subcategories
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<KBCategoriesResponse | KBErrorResponse>> {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeEmpty = searchParams.get('include_empty') === 'true'

    // Fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('kb_categories')
      .select('*')
      .order('level')
      .order('sort_order')
      .order('name')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Fetch article counts per category (only published articles count for non-admin)
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    let articlesQuery = supabase
      .from('kb_articles')
      .select('category_id')

    if (!isAdmin) {
      articlesQuery = articlesQuery.eq('status', 'published')
    }

    const { data: articles, error: articlesError } = await articlesQuery

    if (articlesError) {
      console.error('Error fetching article counts:', articlesError)
      return NextResponse.json(
        { error: 'Failed to fetch article counts' },
        { status: 500 }
      )
    }

    // Count articles per category
    const articleCounts: Record<string, number> = {}
    for (const article of articles || []) {
      if (article.category_id) {
        articleCounts[article.category_id] = (articleCounts[article.category_id] || 0) + 1
      }
    }

    // Transform categories with counts
    const categoriesWithCount: KBCategoryWithCount[] = (categories || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      parent_id: cat.parent_id,
      path: cat.path,
      level: cat.level,
      sort_order: cat.sort_order,
      created_at: cat.created_at,
      article_count: articleCounts[cat.id] || 0,
    }))

    // Build tree structure
    const topLevel: KBCategoryWithCount[] = []
    const childrenMap: Record<string, KBCategoryWithCount[]> = {}

    // First pass: separate by level
    for (const cat of categoriesWithCount) {
      if (cat.level === 1) {
        topLevel.push({ ...cat, children: [] })
      } else if (cat.parent_id) {
        if (!childrenMap[cat.parent_id]) {
          childrenMap[cat.parent_id] = []
        }
        childrenMap[cat.parent_id].push(cat)
      }
    }

    // Second pass: attach children to parents
    for (const parent of topLevel) {
      parent.children = childrenMap[parent.id] || []
      // Add children's article counts to parent's count for display
      const childrenCount = parent.children.reduce((sum, child) => sum + child.article_count, 0)
      parent.article_count += childrenCount
    }

    // Filter out empty categories for non-admin if include_empty is false
    let result = topLevel
    if (!includeEmpty && !isAdmin) {
      result = topLevel.filter(cat => {
        // Keep if has direct articles or has children with articles
        const hasDirectArticles = (articleCounts[cat.id] || 0) > 0
        const hasChildArticles = (cat.children || []).some(child => (articleCounts[child.id] || 0) > 0)
        return hasDirectArticles || hasChildArticles
      }).map(cat => ({
        ...cat,
        children: (cat.children || []).filter(child => (articleCounts[child.id] || 0) > 0)
      }))
    }

    return NextResponse.json({ categories: result })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/categories:', error)
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
 * POST /api/knowledge/categories
 *
 * Creates a new category. Admin only.
 * Accepts: { name, description?, icon?, parent_id?, sort_order? }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<KBCategoryResponse | KBErrorResponse>> {
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

    // Admin only
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can create categories' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: CreateKBCategoryInput = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    // Verify parent exists if provided
    if (body.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('kb_categories')
        .select('id, level')
        .eq('id', body.parent_id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        )
      }

      // Check parent level (can't nest beyond 2 levels)
      if (parent.level === 2) {
        return NextResponse.json(
          { error: 'Cannot create subcategory under a subcategory (max 2 levels)' },
          { status: 400 }
        )
      }
    }

    // Create category (path and level will be set by trigger)
    const categoryData: Partial<KBCategory> = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      icon: body.icon || null,
      parent_id: body.parent_id || null,
      sort_order: body.sort_order ?? 0,
      // path and level are set by the check_category_depth trigger
      path: '', // Placeholder, will be set by trigger
      level: body.parent_id ? 2 : 1, // Preliminary, trigger will validate
    }

    const { data: newCategory, error: createError } = await supabase
      .from('kb_categories')
      .insert(categoryData)
      .select()
      .single()

    if (createError) {
      // Check for depth constraint violation
      if (createError.message.includes('nested beyond 2 levels')) {
        return NextResponse.json(
          { error: 'Categories cannot be nested beyond 2 levels' },
          { status: 400 }
        )
      }
      console.error('Error creating category:', createError)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category: newCategory }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/knowledge/categories:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
