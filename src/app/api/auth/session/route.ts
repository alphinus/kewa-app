import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  validateSession,
  SESSION_COOKIE_NAME
} from '@/lib/session'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false })
    }

    // Use unified session validation
    const session = await validateSession(sessionCookie.value)

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      role: session.role,
      userId: session.userId
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
