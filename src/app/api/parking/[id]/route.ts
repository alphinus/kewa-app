import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { updateParkingStatus, fetchParkingSpot } from '@/lib/parking/parking-queries'
import type { ParkingStatus } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/parking/[id]
 * Fetch a single parking spot
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  // Check KEWA auth
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kewa-session')

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    if (session.role !== 'kewa') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Ungueltige Session' }, { status: 401 })
  }

  const spot = await fetchParkingSpot(id)

  if (!spot) {
    return NextResponse.json(
      { error: 'Parkplatz nicht gefunden' },
      { status: 404 }
    )
  }

  return NextResponse.json({ spot })
}

/**
 * PATCH /api/parking/[id]
 * Update parking spot status (KEWA only)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params

  // Check KEWA auth
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kewa-session')

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    if (session.role !== 'kewa') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Ungueltige Session' }, { status: 401 })
  }

  // Parse body
  const body = await request.json()
  const { status, tenant_name } = body as {
    status: ParkingStatus
    tenant_name?: string | null
  }

  // Validate status
  if (!status || !['free', 'occupied', 'maintenance'].includes(status)) {
    return NextResponse.json(
      { error: 'Ungueltiger Status' },
      { status: 400 }
    )
  }

  // Require tenant name when setting to occupied
  if (status === 'occupied' && !tenant_name) {
    return NextResponse.json(
      { error: 'Mietername erforderlich fuer belegten Parkplatz' },
      { status: 400 }
    )
  }

  const result = await updateParkingStatus(id, status, tenant_name)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Fehler beim Aktualisieren' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
