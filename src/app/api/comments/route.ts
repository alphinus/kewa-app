import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { fetchComments, createComment } from '@/lib/comments/comment-queries'
import { SESSION_COOKIE_NAME, validateSessionWithRBAC } from '@/lib/session'
import { isInternalRole } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import type { CommentEntityType, CommentVisibility } from '@/types/comments'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entity_type') as CommentEntityType
  const entityId = searchParams.get('entity_id')

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: 'entity_type and entity_id required' },
      { status: 400 }
    )
  }

  // Get viewer info from session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  let viewerRole: 'kewa' | 'contractor' = 'contractor'
  let viewerEmail: string | undefined

  if (sessionCookie?.value) {
    const session = await validateSessionWithRBAC(sessionCookie.value)
    if (session) {
      viewerRole = isInternalRole(session.roleName) ? 'kewa' : 'contractor'
      // Fetch email from database for is_own_comment check
      const supabase = await createClient()
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', session.userId)
        .single()
      viewerEmail = user?.email
    }
  }

  const comments = await fetchComments(entityType, entityId, viewerRole, viewerEmail)

  return NextResponse.json({ comments })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  // Validate session JWT
  const session = await validateSessionWithRBAC(sessionCookie.value)
  if (!session) {
    return NextResponse.json({ error: 'Ungültige Session' }, { status: 401 })
  }

  // Fetch user details from database
  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('email, display_name')
    .eq('id', session.userId)
    .single()

  const authorId = session.userId
  const authorEmail = user?.email
  const authorName = user?.display_name
  const isKewa = isInternalRole(session.roleName)

  const body = await request.json()
  const { entity_type, entity_id, content, visibility } = body as {
    entity_type: CommentEntityType
    entity_id: string
    content: string
    visibility: CommentVisibility
  }

  if (!entity_type || !entity_id || !content?.trim()) {
    return NextResponse.json(
      { error: 'entity_type, entity_id, and content required' },
      { status: 400 }
    )
  }

  // Only KEWA can create internal comments
  const finalVisibility: CommentVisibility =
    visibility === 'internal' && isKewa ? 'internal' : 'shared'

  const result = await createComment(
    { entity_type, entity_id, content, visibility: finalVisibility },
    authorId,
    authorEmail,
    authorName
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Fehler beim Speichern' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, comment: result.comment })
}
