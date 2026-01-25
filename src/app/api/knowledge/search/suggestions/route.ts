import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '@/lib/knowledge/search'
import type { KBErrorResponse } from '@/types/knowledge-base'

/**
 * Response type for suggestions endpoint
 */
interface SuggestionsResponse {
  suggestions: string[]
}

/**
 * GET /api/knowledge/search/suggestions
 *
 * Get autocomplete suggestions based on partial search term.
 * Uses pg_trgm similarity for fuzzy matching.
 *
 * Query params:
 * - q: Partial search term (minimum 2 characters)
 * - limit: Maximum suggestions (default 5, max 10)
 *
 * Returns: { suggestions: string[] }
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SuggestionsResponse | KBErrorResponse>> {
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
    const term = searchParams.get('q')
    const limitParam = searchParams.get('limit')

    // Term is required and must be at least 2 characters
    if (!term || term.trim().length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    // Parse and validate limit
    let limit = 5
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
        limit = parsed
      }
    }

    // Get suggestions
    const suggestions = await getSuggestions(term, limit)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/search/suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
