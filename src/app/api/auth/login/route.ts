import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifyPin, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body

    // Validate input
    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'PIN ist erforderlich' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = await createClient()

    // Query all users to check PIN against each hash
    const { data: users, error } = await supabase
      .from('users')
      .select('id, pin_hash, role, display_name')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Datenbankfehler' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Keine Benutzer gefunden' },
        { status: 500 }
      )
    }

    // Find matching user by comparing PIN with each hash
    let matchedUser: typeof users[0] | null = null

    for (const user of users) {
      const isMatch = await verifyPin(pin, user.pin_hash)
      if (isMatch) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Ungültiger PIN' },
        { status: 401 }
      )
    }

    // Create session token
    const role = matchedUser.role as 'kewa' | 'imeri'
    const sessionToken = await createSession(matchedUser.id, role)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)

    return NextResponse.json({
      success: true,
      role: role,
      displayName: matchedUser.display_name
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
