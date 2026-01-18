import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { fetchComments, createComment } from '@/lib/comments/comment-queries'
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
  const sessionCookie = cookieStore.get('kewa-session')
  let viewerRole: 'kewa' | 'contractor' = 'contractor'
  let viewerEmail: string | undefined

  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value)
      viewerRole = session.role === 'kewa' ? 'kewa' : 'contractor'
      viewerEmail = session.email
    } catch {
      // Keep default contractor role
    }
  }

  const comments = await fetchComments(entityType, entityId, viewerRole, viewerEmail)

  return NextResponse.json({ comments })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kewa-session')

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  let authorId: string | undefined
  let authorEmail: string | undefined
  let authorName: string | undefined
  let isKewa = false

  try {
    const session = JSON.parse(sessionCookie.value)
    authorId = session.userId
    authorEmail = session.email
    authorName = session.displayName
    isKewa = session.role === 'kewa'
  } catch {
    return NextResponse.json({ error: 'Ungueltige Session' }, { status: 401 })
  }

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
