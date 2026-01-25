import { NextRequest, NextResponse } from 'next/server'
import { searchArticles } from '@/lib/knowledge/search'
import type { KBSearchResponse, KBErrorResponse, KBSearchFilters } from '@/types/knowledge-base'

/**
 * GET /api/knowledge/search
 *
 * Full-text search for knowledge base articles.
 *
 * Query params:
 * - q: Search query (required)
 * - category_id: Filter by category UUID
 * - visibility: Filter by visibility (internal, contractors, both)
 * - author: Filter by author UUID
 * - from: Filter by date (articles updated on or after)
 * - to: Filter by date (articles updated on or before)
 * - limit: Maximum results (default 20, max 100)
 *
 * Returns: { results: KBSearchResult[], total: number }
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<KBSearchResponse | KBErrorResponse>> {
  try {
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
    const query = searchParams.get('q')
    const categoryId = searchParams.get('category_id')
    const visibility = searchParams.get('visibility')
    const author = searchParams.get('author')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const limitParam = searchParams.get('limit')

    // Query is required
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required (q parameter)' },
        { status: 400 }
      )
    }

    // Parse and validate limit
    let limit = 20
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limit = parsed
      }
    }

    // Validate UUIDs if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (categoryId && !uuidRegex.test(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category_id format' },
        { status: 400 }
      )
    }
    if (author && !uuidRegex.test(author)) {
      return NextResponse.json(
        { error: 'Invalid author format' },
        { status: 400 }
      )
    }

    // Validate visibility if provided
    const validVisibilities = ['internal', 'contractors', 'both']
    if (visibility && !validVisibilities.includes(visibility)) {
      return NextResponse.json(
        { error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` },
        { status: 400 }
      )
    }

    // For contractors, filter to contractor-visible content only
    let effectiveVisibility = visibility
    if (userRole === 'contractor') {
      // Contractors can only see 'contractors' or 'both' visibility articles
      // The RPC function handles this, but we can also enforce here
      if (!visibility || visibility === 'internal') {
        effectiveVisibility = 'contractors'
      }
    }

    // Build filters
    const filters: KBSearchFilters = {
      categoryId: categoryId || undefined,
      audience: effectiveVisibility as KBSearchFilters['audience'],
      author: author || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }

    // Execute search
    const { results, total } = await searchArticles(query, filters, limit)

    return NextResponse.json({ results, total })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
