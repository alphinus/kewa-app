# Phase 26: Tenant Portal Core - Research

**Researched:** 2026-01-29
**Domain:** Next.js route groups, Supabase auth/storage, mobile-first UI, message threads
**Confidence:** HIGH

## Summary

Phase 26 implements a tenant self-service portal within the existing Next.js application using route groups for layout isolation. Research focused on eight technical domains mandated by CONTEXT.md decisions: Next.js 15+ App Router route groups, Supabase Auth invite-based patterns, Supabase Storage for attachments, chat-style message UI, QR code generation, mobile-first design patterns, key-value settings tables, and application-layer data isolation.

The existing codebase already has strong patterns for Supabase integration (separate client/server utilities in `src/lib/supabase/`), authentication (`src/lib/auth.ts` with bcrypt password hashing), RBAC (migrations 022-023), storage (contractor upload utilities), and mobile-first components (48px touch targets in UI components). The tenant portal will extend these patterns rather than introducing new architectural approaches.

**Primary recommendation:** Use `/(portal)` route group with independent layout, extend existing Supabase auth patterns with invite token generation, follow existing storage conventions for ticket attachments, and implement custom chat UI using date-fns (already in package.json) for German relative dates.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.2 | App Router with route groups | Official pattern for independent layouts within one app |
| @supabase/ssr | ^0.8.0 | Supabase client for SSR | Official Supabase integration for Next.js |
| @supabase/supabase-js | ^2.90.1 | Supabase database/auth/storage | Complete backend as a service |
| bcryptjs | ^3.0.3 | Password hashing | Industry standard for password security |
| jose | ^6.1.3 | JWT signing/verification | Minimal, spec-compliant JWT library |
| date-fns | ^4.1.0 | Date formatting and manipulation | Lightweight, tree-shakeable, locale support |
| sonner | ^2.0.7 | Toast notifications | Already integrated in Phase 25 |
| lucide-react | ^0.562.0 | Icons | Consistent iconography across app |

### Supporting (To Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| qrcode.react | ^4.1.0 | QR code React component | Multi-device login via QR code scan |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| qrcode.react | react-qr-code | qrcode.react has 1.3M+ weekly downloads vs 329K, more established |
| qrcode.react | qrcode (node) | Would require manual Canvas/SVG rendering, qrcode.react provides React component |
| Custom chat UI | Stream Chat SDK | Stream is overkill for simple tenant-operator messaging, introduces heavy dependency |
| date-fns | Moment.js | Moment.js is in maintenance mode, date-fns is modern replacement |

**Installation:**
```bash
npm install qrcode.react@^4.1.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (portal)/                    # Route group for tenant portal
│   │   ├── layout.tsx              # Independent portal layout
│   │   ├── page.tsx                # Portal dashboard
│   │   ├── login/                  # Portal auth routes
│   │   ├── register/[token]/       # Invite-based registration
│   │   ├── tickets/                # Ticket list and CRUD
│   │   └── tickets/[id]/           # Ticket detail with messages
│   ├── dashboard/                  # Existing operator app
│   └── api/
│       ├── portal/                 # Portal-specific API routes
│       │   ├── tickets/
│       │   ├── messages/
│       │   └── auth/
│       └── settings/               # App settings CRUD
├── lib/
│   ├── portal/                     # Portal-specific utilities
│   │   ├── ticket-queries.ts      # Ticket data access
│   │   ├── message-queries.ts     # Message data access
│   │   └── tenant-isolation.ts    # Data scoping helpers
│   └── settings/                   # Settings table utilities
│       └── queries.ts
└── components/
    ├── portal/                     # Portal-specific components
    │   ├── TicketCard.tsx
    │   ├── MessageBubble.tsx
    │   ├── MessageList.tsx
    │   └── QRLoginCode.tsx
    └── ui/                         # Shared components (existing)
```

### Pattern 1: Next.js Route Groups for Independent Layouts
**What:** Route groups `(name)` don't affect URL structure but enable different layouts. Portal routes live at `/portal/*` with completely independent UI.

**When to use:** When you need different layout hierarchies (navigation, header, footer) for different sections of the app.

**Implementation:**
```typescript
// src/app/(portal)/layout.tsx
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Independent portal header - no operator navigation */}
      <header className="bg-blue-900 text-white px-4 py-3">
        <h1 className="text-lg font-semibold">KEWA AG - Mieterportal</h1>
      </header>
      <main className="px-4 py-6 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  )
}
```

**Key insight:** Root layout (`app/layout.tsx`) still wraps everything. Portal layout is nested inside it. Both layouts receive children, creating a hierarchy: RootLayout > PortalLayout > Page.

### Pattern 2: Invite-Based Registration with Supabase
**What:** Operator generates invite token when creating tenant record. Token embedded in URL, tenant clicks to register and set password.

**When to use:** No self-registration allowed, tenant must be pre-registered in system (linked to unit).

**Implementation:**
```typescript
// lib/portal/invite-tokens.ts
import { SignJWT } from 'jose'

const INVITE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60 // 7 days

export async function generateInviteToken(
  userId: string,
  unitId: string
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.INVITE_SECRET!)

  const token = await new SignJWT({
    userId,
    unitId,
    type: 'tenant_invite'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${INVITE_EXPIRATION_SECONDS}s`)
    .sign(secret)

  return token
}

export async function generateInviteUrl(token: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  return `${baseUrl}/portal/register/${token}`
}
```

**Verification flow:**
1. Tenant clicks invite link
2. Registration page verifies token via API route
3. If valid, shows password form with email pre-filled
4. On submit, creates user with password_hash, updates tenant_users record
5. Auto-login and redirect to portal dashboard

### Pattern 3: Supabase Storage for Ticket Attachments
**What:** Store ticket photos in `media` bucket following existing path conventions from contractor uploads.

**Storage path convention:**
```
media/
├── tickets/
│   └── {ticket_id}/
│       ├── photos/
│       │   └── {uuid}.webp
│       └── messages/
│           └── {message_id}/
│               └── {uuid}.webp
```

**Implementation:**
```typescript
// lib/portal/ticket-upload.ts
import { createClient } from '@/lib/supabase/client'

export async function uploadTicketPhoto(
  ticketId: string,
  file: File,
  context: 'ticket' | 'message',
  messageId?: string
): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  const path = context === 'ticket'
    ? `tickets/${ticketId}/photos/${fileName}`
    : `tickets/${ticketId}/messages/${messageId}/${fileName}`

  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  return path
}
```

**Validation (reuse existing patterns):**
- Max 5 photos at ticket creation (enforced client + server)
- Max 10MB per photo (from existing `FILE_SIZE_LIMITS`)
- Allowed types: JPEG, PNG, WebP (from existing `ALLOWED_MIME_TYPES`)

### Pattern 4: Chat-Style Message Thread UI
**What:** WhatsApp-like bubble layout with date grouping ("Heute", "Gestern", "DD.MM.YYYY") and read indicators.

**Component structure:**
```typescript
// components/portal/MessageList.tsx
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface Message {
  id: string
  content: string
  sender: 'tenant' | 'operator'
  created_at: string
  read_at: string | null
  attachments?: Attachment[]
}

function groupMessagesByDate(messages: Message[]) {
  const groups: Record<string, Message[]> = {}

  messages.forEach(msg => {
    const date = parseISO(msg.created_at)
    let label: string

    if (isToday(date)) {
      label = 'Heute'
    } else if (isYesterday(date)) {
      label = 'Gestern'
    } else {
      label = format(date, 'dd.MM.yyyy', { locale: de })
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(msg)
  })

  return groups
}

export function MessageList({ messages }: { messages: Message[] }) {
  const grouped = groupMessagesByDate(messages)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateLabel, msgs]) => (
        <div key={dateLabel}>
          {/* Date separator */}
          <div className="flex justify-center my-4">
            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {dateLabel}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-2">
            {msgs.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Message bubble styling:**
```typescript
// components/portal/MessageBubble.tsx
import { Check, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export function MessageBubble({ message }: { message: Message }) {
  const isOwnMessage = message.sender === 'tenant'
  const time = format(parseISO(message.created_at), 'HH:mm')

  return (
    <div className={cn(
      "flex",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2",
        isOwnMessage
          ? "bg-blue-500 text-white rounded-tr-sm"
          : "bg-white text-gray-900 rounded-tl-sm shadow-sm"
      )}>
        <p className="text-base">{message.content}</p>

        {/* Attachments */}
        {message.attachments?.map(att => (
          <img key={att.id} src={att.url} className="mt-2 rounded-lg" />
        ))}

        {/* Time and read status */}
        <div className="flex items-center gap-1 justify-end mt-1">
          <span className={cn(
            "text-xs",
            isOwnMessage ? "text-blue-100" : "text-gray-500"
          )}>
            {time}
          </span>
          {isOwnMessage && (
            message.read_at ? (
              <CheckCheck className="w-4 h-4 text-blue-100" />
            ) : (
              <Check className="w-4 h-4 text-blue-100" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
```

### Pattern 5: QR Code for Multi-Device Login
**What:** Display persistent QR code in tenant settings. Scanning generates auth URL with short-lived token for same-account login on another device.

**Implementation:**
```typescript
// components/portal/QRLoginCode.tsx
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

export function QRLoginCode({ userId }: { userId: string }) {
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    // Generate short-lived QR token
    fetch('/api/portal/auth/qr-token', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
      .then(res => res.json())
      .then(data => {
        const baseUrl = window.location.origin
        setQrUrl(`${baseUrl}/portal/qr-login?token=${data.token}`)
      })
  }, [userId])

  if (!qrUrl) return <div>Lade QR-Code...</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <p className="text-sm text-gray-600 mb-4">
        Scannen Sie diesen Code mit einem anderen Geraet zum Anmelden
      </p>
      <QRCodeSVG
        value={qrUrl}
        size={200}
        level="M"
        includeMargin
      />
      <p className="text-xs text-gray-500 mt-2">
        Gueltig fuer 5 Minuten
      </p>
    </div>
  )
}
```

**Backend QR token generation:**
```typescript
// app/api/portal/auth/qr-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const QR_TOKEN_EXPIRATION = 5 * 60 // 5 minutes

export async function POST(request: NextRequest) {
  const { userId } = await request.json()

  const secret = new TextEncoder().encode(process.env.SESSION_SECRET!)
  const token = await new SignJWT({ userId, type: 'qr_login' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${QR_TOKEN_EXPIRATION}s`)
    .sign(secret)

  return NextResponse.json({ token })
}
```

### Pattern 6: Key-Value Settings Table
**What:** Simple `app_settings` table for company name and configurable values. Preferred over JSONB column for easier querying and updating individual settings.

**Schema:**
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Seed defaults
INSERT INTO app_settings (key, value, value_type, description) VALUES
  ('company_name', 'KEWA AG', 'string', 'Company name displayed in portal'),
  ('support_email', 'info@kewa.ch', 'string', 'Support contact email'),
  ('notfall_phone', '+41 XX XXX XX XX', 'string', 'Emergency hotline number');
```

**Access pattern:**
```typescript
// lib/settings/queries.ts
import { createClient } from '@/lib/supabase/server'

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  return data?.value ?? null
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')

  return Object.fromEntries(
    data?.map(row => [row.key, row.value]) ?? []
  )
}
```

**Why not hstore/JSONB:**
- Settings count is low (<20 keys)
- Individual updates are common (company name change shouldn't rewrite entire JSONB)
- Querying is simpler (no JSONB operators needed)
- Audit trail easier (updated_by tracks who changed what)

### Pattern 7: Application-Layer Data Isolation
**What:** All tenant queries include `WHERE user_id = current_user` scoping. No RLS policies (per STATE.md: "RLS is dead code").

**Tenant query helper:**
```typescript
// lib/portal/tenant-isolation.ts
import { createClient } from '@/lib/supabase/server'

export async function getTenantContext(userId: string) {
  const supabase = await createClient()

  // Get tenant's unit assignment
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('unit_id, is_primary')
    .eq('user_id', userId)
    .is('move_out_date', null) // Active tenants only
    .single()

  if (!tenantUser) {
    throw new Error('Tenant not linked to unit')
  }

  return {
    userId,
    unitId: tenantUser.unit_id,
    isPrimary: tenantUser.is_primary
  }
}

// All tenant queries MUST use this
export async function getTenantTickets(userId: string) {
  const { unitId } = await getTenantContext(userId)
  const supabase = await createClient()

  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('created_by', userId) // Tenant sees only their own tickets
    .order('created_at', { ascending: false })

  return data ?? []
}
```

**Isolation verification checklist:**
- [ ] All tenant API routes call `getTenantContext()` first
- [ ] All queries include user_id/created_by filter
- [ ] Ticket messages filtered by ticket ownership
- [ ] File uploads scoped to owned tickets only
- [ ] No admin/operator data exposed in portal routes

### Anti-Patterns to Avoid
- **Don't use RLS policies** — Application-layer only per project decision
- **Don't share session tokens between operator/tenant** — Separate auth flows, separate cookies
- **Don't expose internal IDs in URLs** — Use UUIDs, never sequential integers
- **Don't trust client-side tenant_id** — Always derive from session, never from request body

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code rendering | Canvas drawing, manual QR algorithm | qrcode.react | Battle-tested, handles error correction levels, scalable SVG output |
| Relative date formatting | Custom "Heute/Gestern" logic | date-fns with locale | Handles edge cases (timezone, DST, leap years), German locale built-in |
| Password hashing | Custom crypto implementation | bcryptjs (existing) | Industry-standard, handles salting, configurable cost factor |
| JWT signing | Manual HMAC implementation | jose (existing) | Spec-compliant, handles expiration, supports multiple algorithms |
| File upload validation | Custom MIME type checking | Existing contractor-upload.ts patterns | Already handles size limits, type validation, German error messages |
| Toast notifications | Custom snackbar component | sonner (existing) | Already integrated in Phase 25, consistent UX |

**Key insight:** The project already has robust patterns for auth, storage, and file handling. Extend existing utilities rather than creating parallel implementations for the portal.

## Common Pitfalls

### Pitfall 1: Route Group Layout Nesting
**What goes wrong:** Portal layout doesn't display correctly, or root layout styles conflict with portal styles.

**Why it happens:** Forgetting that root layout (`app/layout.tsx`) wraps everything. If root layout has a `<BuildingProvider>` or operator-specific context, it affects portal too.

**How to avoid:**
- Keep root layout minimal (fonts, global CSS, truly app-wide providers like PushProvider)
- Portal-specific providers go in `(portal)/layout.tsx`
- Use route-specific CSS classes to avoid style conflicts

**Warning signs:**
- Portal shows operator navigation
- BuildingContext throwing errors in portal
- Fonts/colors inconsistent between layouts

### Pitfall 2: Invite Token Security
**What goes wrong:** Invite link used multiple times, or expired token still works, or token leaks user data in URL.

**Why it happens:** No expiration check, no one-time-use enforcement, or userId/unitId in plaintext in URL.

**How to avoid:**
- JWT with short expiration (7 days max)
- Mark token as "used" after first registration
- Store token hash in database, verify on use
- Never put sensitive data in URL, encode in signed JWT

**Warning signs:**
- Same invite link works after registration
- Invite link works months after generation
- URL contains readable user/unit IDs

### Pitfall 3: Data Isolation Bypass
**What goes wrong:** Tenant sees another tenant's tickets or messages.

**Why it happens:** Forgot to filter by user_id, or trusted client-sent tenant_id, or joined tables without proper scoping.

**How to avoid:**
- ALWAYS call `getTenantContext()` at start of API route
- NEVER accept user_id/tenant_id from request body
- All queries must filter by session-derived user_id
- Add integration tests that try to access other tenant's data

**Warning signs:**
- API route doesn't validate session
- Query uses `req.body.userId` instead of `session.userId`
- No WHERE clause on tenant-scoped tables

### Pitfall 4: Mobile Viewport Assumptions
**What goes wrong:** Portal looks good on desktop, breaks on actual phones (text too small, buttons too close, horizontal scroll).

**Why it happens:** Testing only in browser DevTools, not real devices. DevTools doesn't simulate touch accuracy or actual viewport sizes.

**How to avoid:**
- Test on real Android/iOS device (or BrowserStack)
- Use 16px base font (no smaller for body text)
- 48px minimum touch targets (existing Button component already does this)
- `viewport` meta tag with `width=device-width, initial-scale=1`

**Warning signs:**
- Users complain about "tiny text"
- Buttons too hard to tap accurately
- Pinch-to-zoom required to read content

### Pitfall 5: Message Ordering and Realtime Updates
**What goes wrong:** New messages appear out of order, or user sends message but it doesn't show up immediately.

**Why it happens:** Sorting by client timestamp instead of server timestamp, or not subscribing to Realtime updates, or race condition between optimistic update and server response.

**How to avoid:**
- Always sort by `created_at` from server (authoritative)
- Use Supabase Realtime to subscribe to new messages
- Optimistic update: add message to UI immediately, replace with server version when confirmed
- Handle Realtime reconnection (show "Reconnecting..." state)

**Warning signs:**
- Messages jump around after page refresh
- Sending message shows loading forever
- Multiple devices show messages in different orders

### Pitfall 6: QR Code Token Reuse Attack
**What goes wrong:** Attacker intercepts QR code, saves it, uses it later to access account.

**Why it happens:** QR token has long expiration, or no rate limiting, or token isn't invalidated after first use.

**How to avoid:**
- Short expiration (5 minutes)
- One-time use tokens (mark as used in DB)
- Rate limit QR token generation (max 10/hour per user)
- Log QR logins in audit trail

**Warning signs:**
- QR tokens work for hours
- Same QR code screenshot works multiple times
- No audit log for QR logins

## Code Examples

Verified patterns from official sources and existing codebase:

### Date Grouping with German Locale
```typescript
// Source: date-fns docs + project usage
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

export function formatMessageDate(dateString: string): string {
  const date = parseISO(dateString)

  if (isToday(date)) return 'Heute'
  if (isYesterday(date)) return 'Gestern'

  return format(date, 'dd.MM.yyyy', { locale: de })
}

export function formatMessageTime(dateString: string): string {
  return format(parseISO(dateString), 'HH:mm')
}
```

### Supabase Realtime Subscription for Messages
```typescript
// Source: Supabase Realtime docs + existing patterns
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))

    // Subscribe to new messages
    const channel: RealtimeChannel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [ticketId])

  return messages
}
```

### Read Receipt Update
```typescript
// Mark message as read when viewed
export async function markMessageAsRead(messageId: string, userId: string) {
  const supabase = createClient()

  await supabase
    .from('ticket_messages')
    .update({ read_at: new Date().toISOString(), read_by: userId })
    .eq('id', messageId)
    .is('read_at', null) // Only update if not already read
}

// Mark all messages in a ticket as read
export async function markTicketMessagesAsRead(ticketId: string, userId: string) {
  const supabase = createClient()

  await supabase
    .from('ticket_messages')
    .update({ read_at: new Date().toISOString(), read_by: userId })
    .eq('ticket_id', ticketId)
    .neq('created_by', userId) // Don't mark own messages as read
    .is('read_at', null)
}
```

### Tenant Session Validation Middleware
```typescript
// lib/portal/session.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

export async function validateTenantSession(request: NextRequest) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  // Verify user is tenant role
  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('role_id, roles!inner(name)')
    .eq('id', session.userId)
    .single()

  if (user?.roles.name !== 'tenant') {
    return NextResponse.json(
      { error: 'Zugriff verweigert' },
      { status: 403 }
    )
  }

  return { session, userId: session.userId }
}

// Usage in API route
export async function GET(request: NextRequest) {
  const validation = await validateTenantSession(request)
  if (validation instanceof NextResponse) return validation

  const { userId } = validation
  // ... rest of handler
}
```

### Photo Attachment Upload
```typescript
// Reuse existing patterns from contractor-upload.ts
import { validateContractorUpload, generateStoragePath } from '@/lib/storage/contractor-upload'

export async function uploadTicketAttachment(
  file: File,
  ticketId: string
): Promise<{ path: string; url: string }> {
  // Validate (reuse existing validation)
  const validation = validateContractorUpload(file, 'photo')
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const path = `tickets/${ticketId}/photos/${fileName}`

  const { error } = await supabase.storage
    .from('media')
    .upload(path, file)

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(path)

  return { path, url: urlData.publicUrl }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment.js for dates | date-fns with locales | 2023+ | Smaller bundle, tree-shakeable, modern API |
| react-qr-code | qrcode.react | 2025+ | More established library, better TypeScript support |
| Custom message UI libs | Hand-rolled with Tailwind | Current | Full control, mobile-optimized, no heavy SDK |
| RLS for isolation | Application-layer queries | Phase 1 decision | Simpler debugging, explicit control, no policy conflicts |
| Hardcoded company name | app_settings table | Phase 26 | Admin-configurable, no code changes for rebrand |

**Deprecated/outdated:**
- Moment.js: In maintenance mode since 2020, recommend date-fns
- Supabase Auth Admin inviteUserByEmail: Use generateLink() for new code (more flexible)
- `users.role` column: Replaced by `users.role_id` FK to roles table (migration 023)

## Open Questions

Things that couldn't be fully resolved:

1. **Notification delivery method for Notfall tickets**
   - What we know: Notfall urgency triggers immediate notification to all operators (CONTEXT.md)
   - What's unclear: Email? Push? SMS? Or just in-app notification center?
   - Recommendation: Use existing push notification system from Phase 24, extend triggers for Notfall tickets. Email as fallback if push not enabled.

2. **Deactivated tenant session invalidation mechanism**
   - What we know: Operator manually deactivates tenant on move-out, existing sessions must be invalidated (CONTEXT.md)
   - What's unclear: How to invalidate JWT sessions that are stateless?
   - Recommendation: Add `is_active` check in session validation middleware. Sessions remain valid until expiration but API rejects requests from inactive users. For immediate invalidation, maintain session blocklist in Redis or database table.

3. **QR multi-device login vs new session**
   - What we know: QR code logs in same account on another device (CONTEXT.md)
   - What's unclear: Should it invalidate previous device session, or allow concurrent sessions?
   - Recommendation: Allow concurrent sessions (tenant might use phone + tablet). Operator can see "Active sessions" list and revoke individual sessions if needed.

4. **Ticket auto-close notification timing**
   - What we know: Auto-closes after 7 days if no tenant response (CONTEXT.md)
   - What's unclear: When to send warning notification? 1 day before? 2 days?
   - Recommendation: Send notification at 5 days (2-day warning), again at 6.5 days (12-hour warning). Requires background job infrastructure (cron or Supabase scheduled functions).

## Sources

### Primary (HIGH confidence)
- Next.js 15 Official Documentation - [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- Next.js 15 Tutorial - [Multiple Root Layouts with Route Groups](https://javascript.plainenglish.io/next-js-15-tutorial-part-15-using-multiple-root-layouts-with-route-groups-818908c08c68)
- Supabase Auth Documentation - [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- Supabase Auth API - [inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- Supabase Storage Documentation - [Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- Supabase Realtime Documentation - [Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- date-fns Documentation - [Format](https://day.js.org/docs/en/display/format) and German locale
- Existing codebase patterns: `src/lib/auth.ts`, `src/lib/supabase/`, `src/lib/storage/contractor-upload.ts`

### Secondary (MEDIUM confidence)
- [Supabase Multi-Tenancy Patterns](https://bootstrapped.app/guide/how-to-set-up-supabase-with-a-multi-tenant-architecture) - Application-layer isolation approach verified
- [PostgreSQL Key-Value Settings Pattern](https://basila.medium.com/designing-a-user-settings-database-table-e8084fcd1f67) - Simple table vs hstore/JSONB tradeoffs
- [Flowbite Chat Bubble Components](https://flowbite.com/docs/components/chat-bubble/) - Tailwind CSS chat UI patterns
- [React QR Code Libraries Comparison](https://npm-compare.com/qr-code-styling,qr-image,qrcode,qrcode-generator,react-qr-code) - qrcode.react vs alternatives
- [Mobile-First Design in React](https://blog.pixelfreestudio.com/how-to-implement-mobile-first-design-in-react/) - Touch target guidelines

### Tertiary (LOW confidence)
- Community discussions on GitHub issues for Stream Chat, CometChat (read receipts UX patterns)
- DEV Community articles on Next.js route groups (mastering patterns, practical examples)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing project dependencies verified, qrcode.react widely adopted
- Architecture: HIGH - Next.js route groups official feature, existing codebase patterns established
- Pitfalls: MEDIUM - Based on documentation warnings and community issues, not production experience
- Data isolation: HIGH - Verified from existing migrations 022-023, application-layer approach confirmed in STATE.md
- Chat UI patterns: MEDIUM - Custom implementation required, no standard library, patterns verified from multiple sources
- QR code generation: HIGH - qrcode.react is standard React library with 1.3M+ weekly downloads

**Research date:** 2026-01-29
**Valid until:** 60 days (stable domain, Next.js/Supabase patterns unlikely to change rapidly)

**Codebase analysis:**
- Migrations 001-061 reviewed for schema patterns
- RBAC system (migrations 022-023) understood for tenant role integration
- Existing auth patterns (lib/auth.ts, lib/session.ts) identified for extension
- Storage patterns (lib/storage/contractor-upload.ts) analyzed for reuse
- UI components (components/ui/) examined for mobile-first patterns
- Route structure (app/dashboard, app/contractor) analyzed for portal route group placement
