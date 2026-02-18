import { createServerClient } from '@supabase/ssr'
import { createClient as createBareClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * OrgContextMissingError
 *
 * Thrown by createOrgClient when the x-organization-id header is absent.
 * Route handlers should map this to a 401 response.
 */
export class OrgContextMissingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgContextMissingError'
  }
}

/**
 * createOrgClient(request)
 *
 * Creates a Supabase client scoped to the organization resolved by middleware.
 * Reads the x-organization-id header set by middleware, then calls the
 * set_org_context RPC to establish the Postgres session variable used by RLS.
 *
 * Use for all tenant-scoped queries (~95% of API routes).
 *
 * @throws OrgContextMissingError when x-organization-id header is absent
 * @throws Error when set_org_context RPC fails
 */
export async function createOrgClient(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')

  if (!orgId || orgId.trim() === '') {
    throw new OrgContextMissingError('x-organization-id header required')
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    }
  )

  const { error } = await supabase.rpc('set_org_context', { org_id: orgId })

  if (error) {
    throw new Error('Failed to set org context: ' + error.message)
  }

  return supabase
}

/**
 * createPublicClient()
 *
 * Creates a plain Supabase client using the anon key without org context.
 * Use for global lookup tables (ticket_categories, roles, permissions)
 * and auth/portal routes where no organization scope is needed.
 */
export async function createPublicClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    }
  )
}

/**
 * createServiceClient()
 *
 * Creates a Supabase client using the service_role key.
 * Bypasses all RLS policies — use only for explicit admin operations
 * (user management, cross-org admin tasks, system-level writes).
 *
 * Uses @supabase/supabase-js directly (no cookie handling needed).
 *
 * @throws Error when SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  }

  return createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
