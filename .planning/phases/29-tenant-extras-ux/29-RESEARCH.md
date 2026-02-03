# Phase 29: Tenant Extras & UX Improvements - Research

**Researched:** 2026-02-03
**Domain:** Email/push notifications, ticket-to-work-order conversion, profile management, UX patterns (loading/empty/error states, validation, breadcrumbs)
**Confidence:** HIGH

## Summary

Phase 29 spans three distinct domains: notification delivery (extending Phase 24 push infrastructure with HTML emails), data conversion (ticket-to-work-order with file copying), and systematic UX polish (loading/empty/error states, form validation, breadcrumbs). The ecosystem has converged on proven patterns: Resend + React Email for transactional HTML emails, Supabase Storage `.copy()` for file duplication, native form validation patterns (no additional library needed), react-loading-skeleton for skeleton loaders, and custom breadcrumb component using Next.js App Router hooks.

**Key architecture decisions from CONTEXT.md:**
- **Notification fallback chain**: Push → Email → Track delivery status (locked decision)
- **HTML email format**: Styled emails with inline content, not plain text only (locked decision)
- **Ticket conversion**: Manual operator-triggered, copies photos (not references), one-click UI (locked decision)
- **Profile scope**: Phone + emergency contact editable, email/password read-only (locked decision)
- **UX standards**: Skeleton loaders (not spinners), German error messages, inline validation on blur+submit, breadcrumbs skip Dashboard level (locked decisions)

**Primary recommendation:** Use Resend API with React Email templates for HTML emails, leverage existing push notification infrastructure from Phase 24, implement Supabase Storage `.copy()` for ticket photo duplication, build custom form validation using existing patterns (no react-hook-form needed), use react-loading-skeleton for skeleton UI, and create reusable UX pattern components (EmptyState, ErrorBoundary, ConfirmDialog) following established design system.

## Standard Stack

The established libraries/tools for this phase's domains:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^4.0.0 | Email API for transactional emails | Modern email API, zero-config, developer-friendly, officially recommended by Vercel. React Email integration out-of-box. |
| react-email | ^3.0.1 | React components for HTML emails | Build emails using React, preview during development, handles table-based layouts automatically, Tailwind support. |
| @supabase/ssr | 0.8.0 | Supabase client (already installed) | Storage `.copy()` method for file duplication. Timestamp authority for conflict resolution. |
| react-loading-skeleton | ^3.5.0 | Skeleton loader components | Industry standard, auto-sizes to match content, minimal API, Tailwind-compatible, zero dependencies. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications (already installed) | Error/success feedback after form submission, notification fallback tracking. |
| web-push | 3.6.7+ | Push notifications (already installed Phase 24) | Existing push infrastructure, no changes needed. |
| lucide-react | 0.562.0 | Icons (already installed) | Empty state icons, breadcrumb separators, loading indicators. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | SendGrid | More complex API, enterprise focus, overkill for transactional emails. |
| Resend | Nodemailer + SMTP | Manual SMTP configuration, no React Email integration, harder to test. |
| React Email | MJML | XML-based, different syntax, no React component reuse. |
| react-loading-skeleton | Custom Tailwind skeletons | Reinvents wheel, no auto-sizing, more maintenance. |
| Custom validation | react-hook-form + zod | Adds 40KB+ dependencies, overkill for simple forms. Existing pattern works. |
| Custom breadcrumbs | nextjs-breadcrumbs package | Generic solution, doesn't match locked decisions (condensed format, skip Dashboard). |

**Installation:**
```bash
npm install resend react-email react-loading-skeleton
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       ├── notifications/
│       │   └── send-email/route.ts        # Email dispatch endpoint
│       ├── tickets/
│       │   └── [id]/
│       │       └── convert-to-wo/route.ts # Ticket → WO conversion
│       └── tenants/
│           └── profile/route.ts           # Tenant profile update
├── components/
│   ├── ui/
│   │   ├── empty-state.tsx                # Reusable empty state component
│   │   ├── error-boundary.tsx             # Error boundary with retry
│   │   ├── confirmation-dialog.tsx        # AlertDialog wrapper for confirmations
│   │   └── breadcrumbs.tsx                # Dynamic breadcrumb navigation
│   └── skeletons/
│       ├── PropertyListSkeleton.tsx       # Property list loading state
│       ├── UnitDetailSkeleton.tsx         # Unit detail loading state
│       └── TicketListSkeleton.tsx         # Ticket list loading state
├── emails/
│   ├── ticket-status-changed.tsx          # Ticket status email template
│   └── ticket-reply-received.tsx          # New message email template
└── lib/
    ├── email/
    │   ├── client.ts                      # Resend client singleton
    │   └── send.ts                        # Email sending helpers
    └── validation/
        └── profile.ts                     # Profile form validation rules
```

### Pattern 1: HTML Email Templates with React Email

**What:** Build transactional emails using React components that compile to table-based HTML with inline styles.

**When to use:** All notification emails (ticket status changes, message replies).

**Example:**
```typescript
// Source: https://react.email/docs/introduction + https://resend.com/docs/send-with-nextjs
import { Html, Head, Body, Container, Section, Text, Button, Img } from '@react-email/components'

interface TicketStatusEmailProps {
  tenantName: string
  ticketNumber: string
  oldStatus: string
  newStatus: string
  ticketUrl: string
  messageContent?: string
}

export default function TicketStatusEmail({
  tenantName,
  ticketNumber,
  oldStatus,
  newStatus,
  ticketUrl,
  messageContent,
}: TicketStatusEmailProps) {
  const statusText = {
    offen: 'Offen',
    in_bearbeitung: 'In Bearbeitung',
    geschlossen: 'Geschlossen',
  }[newStatus]

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px' }}>
          <Section>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Ticket {ticketNumber} - Status Update
            </Text>
            <Text style={{ fontSize: '16px', marginBottom: '16px' }}>
              Hallo {tenantName},
            </Text>
            <Text style={{ fontSize: '16px', marginBottom: '16px' }}>
              Der Status Ihres Tickets hat sich geändert: <strong>{statusText}</strong>
            </Text>
            {messageContent && (
              <Section style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <Text style={{ fontSize: '14px', margin: 0 }}>{messageContent}</Text>
              </Section>
            )}
            <Button
              href={ticketUrl}
              style={{ backgroundColor: '#0070f3', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}
            >
              Ticket anzeigen
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

**Key points:**
- All styles must be inline for email client compatibility
- Use `@react-email/components` primitives (Html, Body, Container, etc.)
- Tables are handled automatically by React Email
- Preview during development: `npm run email:dev` (add script to package.json)

### Pattern 2: Supabase Storage File Copying

**What:** Copy files between buckets or within same bucket using Supabase Storage `.copy()` method.

**When to use:** Ticket-to-work-order photo conversion (copy photos from ticket_attachments bucket to work_order_photos bucket).

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/storage/management/copy-move-objects
import { createClient } from '@supabase/supabase-js'

async function copyTicketPhotosToWorkOrder(
  ticketAttachmentPaths: string[],
  workOrderId: string
): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
  )

  const newPaths: string[] = []

  for (const oldPath of ticketAttachmentPaths) {
    // Generate new path in work_order_photos bucket
    const fileName = oldPath.split('/').pop()
    const newPath = `${workOrderId}/${Date.now()}-${fileName}`

    // Copy file (up to 5GB limit per file)
    const { error } = await supabase.storage
      .from('ticket_attachments')
      .copy(oldPath, newPath, {
        destinationBucket: 'work_order_photos',
      })

    if (error) {
      console.error('Failed to copy photo:', error)
      throw new Error(`Photo copy failed: ${error.message}`)
    }

    newPaths.push(newPath)
  }

  return newPaths
}
```

**Key points:**
- Use service role key (server-side only) for cross-bucket copying
- Current limit: 5GB per file (sufficient for photos)
- Sequential copying for error handling (no parallel batch operation)
- Generates new path to avoid collisions

### Pattern 3: Inline Form Validation (No Library)

**What:** Manual validation using state management, triggered on blur + submit, with inline error display.

**When to use:** All forms (tenant profile, ticket creation, etc.). Follows existing TaskForm.tsx pattern.

**Example:**
```typescript
// Source: Existing codebase pattern from src/components/tasks/TaskForm.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfileForm({ initialData, onSave }) {
  const [phone, setPhone] = useState(initialData.phone || '')
  const [emergencyName, setEmergencyName] = useState(initialData.emergency_contact_name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_contact_phone || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Validate single field (on blur)
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    if (field === 'phone') {
      if (!value.trim()) {
        newErrors.phone = 'Telefonnummer ist erforderlich'
      } else if (!/^[0-9+ ()-]+$/.test(value)) {
        newErrors.phone = 'Ungültiges Telefonnummer-Format'
      } else {
        delete newErrors.phone
      }
    }

    if (field === 'emergencyPhone') {
      if (value && !/^[0-9+ ()-]+$/.test(value)) {
        newErrors.emergencyPhone = 'Ungültiges Telefonnummer-Format'
      } else {
        delete newErrors.emergencyPhone
      }
    }

    setErrors(newErrors)
  }

  // Validate all fields (on submit)
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!phone.trim()) {
      newErrors.phone = 'Telefonnummer ist erforderlich'
    } else if (!/^[0-9+ ()-]+$/.test(phone)) {
      newErrors.phone = 'Ungültiges Telefonnummer-Format'
    }

    if (emergencyPhone && !/^[0-9+ ()-]+$/.test(emergencyPhone)) {
      newErrors.emergencyPhone = 'Ungültiges Telefonnummer-Format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return

    setSaving(true)
    try {
      await onSave({ phone, emergency_contact_name: emergencyName, emergency_contact_phone: emergencyPhone })
    } catch (error) {
      setErrors({ submit: 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="phone">Telefonnummer *</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={(e) => validateField('phone', e.target.value)}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="text-sm text-red-600 mt-1">
            {errors.phone}
          </p>
        )}
      </div>
      {/* More fields... */}
      <button type="submit" disabled={saving}>
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </form>
  )
}
```

**Key points:**
- Validate on blur (after first interaction with field)
- Validate all on submit
- Show inline errors below field
- German error messages
- Use aria attributes for accessibility

### Pattern 4: Skeleton Loaders with react-loading-skeleton

**What:** Gray placeholder shapes that auto-match content layout during data fetching.

**When to use:** All data-fetching views (property list, unit detail, ticket list, etc.).

**Example:**
```typescript
// Source: https://github.com/dvtng/react-loading-skeleton
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function PropertyListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
          <div className="flex items-start gap-4">
            {/* Icon skeleton */}
            <Skeleton circle width={48} height={48} />

            <div className="flex-1">
              {/* Title skeleton */}
              <Skeleton width="60%" height={24} className="mb-2" />

              {/* Subtitle skeleton */}
              <Skeleton width="40%" height={16} className="mb-3" />

              {/* Stats skeleton */}
              <div className="flex gap-4">
                <Skeleton width={80} height={20} />
                <Skeleton width={100} height={20} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Usage in page:
export default function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  // ... fetch logic

  if (loading) return <PropertyListSkeleton />

  return <PropertyList properties={properties} />
}
```

**Key points:**
- Import CSS: `import 'react-loading-skeleton/dist/skeleton.css'`
- Use `count` prop for repeated lines
- Use `circle` prop for circular shapes
- Skeleton auto-inherits font size and line height
- Match content structure, not pixel-perfect design

### Pattern 5: Dynamic Breadcrumbs with Next.js App Router

**What:** Breadcrumb navigation that reflects current route hierarchy, skipping Dashboard level.

**When to use:** Deep hierarchies (Property → Unit → Work Order → Task).

**Example:**
```typescript
// Source: https://jeremykreutzbender.com/blog/app-router-dynamic-breadcrumbs
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // Parse pathname into segments
  const segments = pathname.split('/').filter(Boolean)

  // Skip 'dashboard' segment (locked decision from CONTEXT.md)
  const breadcrumbs: BreadcrumbItem[] = segments
    .filter((segment) => segment !== 'dashboard')
    .map((segment, index, filteredSegments) => {
      const href = '/dashboard/' + filteredSegments.slice(0, index + 1).join('/')
      const label = segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      return { label, href }
    })

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-gray-900 dark:hover:text-gray-100">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

**Key points:**
- Use `usePathname()` hook (Next.js App Router)
- Client component (`'use client'`)
- Skip Dashboard level per locked decision
- Condensed format: Property > Unit > Current
- Last item non-clickable (current page)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom HTML templates with string concatenation | React Email | Table-based layouts, inline styles, responsive handling, preview server, React component reuse. Email rendering is notoriously complex. |
| Skeleton loaders | Custom Tailwind pulse divs | react-loading-skeleton | Auto-sizing, consistency, accessibility (aria-busy), theme support, zero maintenance. |
| Email deliverability | Direct SMTP with Nodemailer | Resend API | SPF/DKIM/DMARC handling, bounce tracking, rate limiting, retry logic, domain reputation. |
| File copying with metadata | Manual blob download + re-upload | Supabase Storage `.copy()` | Server-side operation (faster), preserves metadata, atomic operation, handles large files. |
| Form validation schema | Custom validation objects | Keep existing pattern | No library needed for 3-5 field forms. React Hook Form + Zod adds 40KB+ for minimal benefit. |

**Key insight:** Email and file operations have hidden complexity. Resend handles deliverability infrastructure, React Email handles cross-client compatibility, Supabase handles efficient server-side copying. Don't rebuild these.

## Common Pitfalls

### Pitfall 1: Email Client CSS Compatibility

**What goes wrong:** Modern CSS (flexbox, grid, custom properties) breaks in Outlook, Yahoo Mail, Gmail mobile.

**Why it happens:** Email clients use decades-old rendering engines. Outlook uses Word's HTML renderer (no joke).

**How to avoid:**
- Use React Email components (handle table layouts automatically)
- All styles must be inline (no external stylesheets)
- Avoid flexbox, grid, CSS variables
- Test with real email clients (Litmus or Email on Acid for production)

**Warning signs:**
- Layout works in browser preview but breaks in Gmail
- Buttons don't appear clickable in Outlook
- Dark mode inverts colors incorrectly

### Pitfall 2: Push Notification Permission Denial

**What goes wrong:** User denies push permission, email fallback never triggers because code assumes push always works.

**Why it happens:** Notification.permission state not checked before attempting push dispatch.

**How to avoid:**
- Check `pushSubscription` existence before sending push
- If no subscription, skip push and send email immediately
- Track delivery status: `{ push: boolean, email: boolean }` in database
- Don't throw errors on missing subscription (expected case)

**Warning signs:**
- Tenant says "I never got notified"
- No fallback email sent
- Push errors logged but not handled

### Pitfall 3: File Copy Across Buckets Without Service Role Key

**What goes wrong:** Cross-bucket copy fails with "Unauthorized" error even though user is authenticated.

**Why it happens:** Anon key doesn't have permission for cross-bucket operations. Service role key required.

**How to avoid:**
- Use service role key on server-side only (`SUPABASE_SERVICE_ROLE_KEY`)
- Never expose service role key to client
- Perform copy in API route, not client component
- Validate user permission before copying (prevent abuse)

**Warning signs:**
- Copy works within same bucket but fails across buckets
- "Unauthorized" error despite user authentication
- Client-side copy attempts

### Pitfall 4: Skeleton Loader Width Collapse in Flex Containers

**What goes wrong:** Skeleton renders at 0 width in flex containers.

**Why it happens:** Flex children without content collapse to minimum width. Skeleton has no intrinsic width.

**How to avoid:**
- Use `containerClassName="flex-1"` prop on Skeleton
- Or wrap Skeleton in div with explicit width/flex properties
- Or use `width` prop to set explicit size

**Warning signs:**
- Skeleton visible in inspector but not on screen
- Layout looks broken during loading
- Width suddenly appears when data loads

### Pitfall 5: Breadcrumb Navigation with Dynamic Route Params

**What goes wrong:** Breadcrumb shows UUID instead of readable name (e.g., "/properties/abc-123-def" instead of "/properties/Musterstrasse 1").

**Why it happens:** Pathname only contains route segments, not data. Need to fetch entity names.

**How to avoid:**
- Accept optional `labels` prop for custom segment names
- Fetch entity data in page component, pass to breadcrumbs
- Cache entity names in localStorage to avoid repeated fetches
- Or use route params if available in App Router context

**Warning signs:**
- Breadcrumbs show database IDs
- Users can't understand current location
- Breadcrumbs update before labels load

### Pitfall 6: Validation Firing on Every Keystroke (onChange)

**What goes wrong:** Error messages flash while user is typing, creating frustrating UX.

**Why it happens:** Validation triggered onChange instead of onBlur.

**How to avoid:**
- Validate on blur (first interaction with field)
- Once field has been validated, re-validate onChange (for instant feedback on fix)
- Submit validation always runs (catches unfocused fields)
- Don't show errors until user leaves field

**Warning signs:**
- Red error text appears while typing
- Users complain about "jumpy" form
- Error messages flicker

## Code Examples

Verified patterns from official sources:

### Sending Email with Resend in Next.js API Route

```typescript
// Source: https://resend.com/docs/send-with-nextjs
// app/api/notifications/send-email/route.ts
import { Resend } from 'resend'
import TicketStatusEmail from '@/emails/ticket-status-changed'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { tenantEmail, tenantName, ticketNumber, newStatus, ticketUrl } = await request.json()

  try {
    const { data, error } = await resend.emails.send({
      from: 'KEWA Support <support@kewa.example.com>',
      to: [tenantEmail],
      subject: `Ticket ${ticketNumber} - Status Update`,
      react: TicketStatusEmail({
        tenantName,
        ticketNumber,
        newStatus,
        ticketUrl,
      }),
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true, emailId: data.id })
  } catch (error) {
    return Response.json({ error: 'Email sending failed' }, { status: 500 })
  }
}
```

### Notification Dispatch with Push → Email Fallback

```typescript
// lib/email/send.ts (extends Phase 24 notification system)
import { sendPushNotification } from '@/lib/notifications/send'
import { sendEmail } from '@/lib/email/client'

export async function notifyTenantTicketUpdate({
  tenantId,
  tenantEmail,
  tenantName,
  ticketId,
  ticketNumber,
  newStatus,
  messageContent,
}: {
  tenantId: string
  tenantEmail: string
  tenantName: string
  ticketId: string
  ticketNumber: string
  newStatus: string
  messageContent?: string
}) {
  const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/tickets/${ticketId}`

  let pushSuccess = false
  let emailSuccess = false

  // Try push notification first
  try {
    const pushResult = await sendPushNotification({
      userId: tenantId,
      title: `Ticket ${ticketNumber}`,
      body: `Status: ${newStatus}`,
      url: `/portal/tickets/${ticketId}`,
      urgency: 'normal',
    })
    pushSuccess = pushResult.sent
  } catch (error) {
    console.error('Push notification failed:', error)
    // Don't throw - continue to email fallback
  }

  // Always send email (user may have multiple devices, email is record)
  try {
    await sendEmail({
      to: tenantEmail,
      subject: `Ticket ${ticketNumber} - Status Update`,
      template: 'ticket-status-changed',
      data: {
        tenantName,
        ticketNumber,
        newStatus,
        ticketUrl,
        messageContent,
      },
    })
    emailSuccess = true
  } catch (error) {
    console.error('Email notification failed:', error)
  }

  // Track delivery status for debugging
  await trackNotificationDelivery(ticketId, { pushSuccess, emailSuccess })

  return { pushSuccess, emailSuccess }
}
```

### Empty State Component

```typescript
// Source: https://chakra-ui.com/docs/components/empty-state (pattern reference)
// components/ui/empty-state.tsx
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-gray-400 dark:text-gray-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Usage:
import { Home } from 'lucide-react'

<EmptyState
  icon={<Home className="h-12 w-12" />}
  title="Keine Liegenschaften"
  description="Sie haben noch keine Liegenschaften erstellt. Erstellen Sie Ihre erste Liegenschaft, um zu beginnen."
  action={{
    label: '+ Liegenschaft erstellen',
    onClick: () => router.push('/dashboard/properties/new'),
  }}
/>
```

### Confirmation Dialog with Radix AlertDialog

```typescript
// Source: https://www.radix-ui.com/primitives/docs/components/alert-dialog
// components/ui/confirmation-dialog.tsx
'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'primary'
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  variant = 'danger',
}: ConfirmationDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6 z-50">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={variant} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

// Usage:
const [showConfirm, setShowConfirm] = useState(false)

<ConfirmationDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Ticket löschen?"
  description="Diese Aktion kann nicht rückgängig gemacht werden."
  confirmLabel="Löschen"
  cancelLabel="Abbrechen"
  variant="danger"
  onConfirm={handleDelete}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plain text emails | HTML emails with React Email | 2023+ | Better branding, inline content, responsive design. React Email launch was game-changer. |
| String template emails | Component-based emails | 2024+ | Type-safe props, reusable patterns, preview during dev. |
| Manual file download + upload | Supabase Storage `.copy()` | 2024 (Supabase v2) | Server-side operation, faster, preserves metadata. |
| react-hook-form everywhere | Native validation for simple forms | 2025+ | Bundle size optimization. Library only needed for complex multi-step forms. |
| Spinner everywhere | Skeleton loaders | 2024+ | Perceived performance improvement. Users feel app loads faster. |
| Generic loading states | Content-aware skeletons | 2025+ | Skeletons match content shape, less jarring transition. |

**Deprecated/outdated:**
- **Nodemailer + custom SMTP**: Too complex for transactional emails. Resend abstracts deliverability infrastructure.
- **MJML for emails**: XML-based, no React integration. React Email replaced it.
- **Custom breadcrumb packages**: Next.js App Router changed routing paradigm. Custom solutions better for App Router.

## Open Questions

Things that couldn't be fully resolved:

1. **Email delivery rate tracking**
   - What we know: Resend provides webhook events for delivery, bounce, complaint
   - What's unclear: Should Phase 29 implement webhook handler for delivery tracking, or defer to future phase?
   - Recommendation: Track send success/failure only. Defer webhook integration to future observability phase.

2. **Breadcrumb labels for dynamic routes**
   - What we know: Pathname only contains route segments, not entity names (e.g., property name)
   - What's unclear: Should breadcrumbs fetch entity data, or accept labels as props?
   - Recommendation: Accept optional `labels` prop. Page component fetches data, passes to breadcrumbs. Keeps breadcrumb component simple.

3. **Skeleton loader theme consistency**
   - What we know: react-loading-skeleton supports SkeletonTheme for global colors
   - What's unclear: Should theme match Tailwind CSS variables, or use default gray?
   - Recommendation: Use SkeletonTheme with Tailwind colors (`baseColor: 'rgb(var(--gray-200))'`) for consistency with existing design system.

## Sources

### Primary (HIGH confidence)
- [Resend Next.js Documentation](https://resend.com/docs/send-with-nextjs) - Installation, API usage, configuration
- [React Email Components](https://react.email/components) - Component library, templates
- [Supabase Storage Copy Documentation](https://supabase.com/docs/guides/storage/management/copy-move-objects) - File copying API
- [Radix UI AlertDialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog) - Confirmation dialog component
- [react-loading-skeleton GitHub](https://github.com/dvtng/react-loading-skeleton) - Skeleton loader implementation

### Secondary (MEDIUM confidence)
- [Building Dynamic Breadcrumbs in Next.js App Router](https://jeremykreutzbender.com/blog/app-router-dynamic-breadcrumbs) - WebSearch verified with Next.js patterns
- [React Form Validation Best Practices (2026)](https://thelinuxcode.com/react-form-validation-with-formik-and-yup-2026-edition/) - WebSearch for validation patterns
- [HTML Email Best Practices for 2026](https://medium.com/@romualdo.bugai/designing-high-performance-email-layouts-in-2026-a-practical-guide-from-the-trenches-a3e7e4535692) - WebSearch for email compatibility
- [Supabase Automatic Timestamps](https://dev.to/paullaros/updating-timestamps-automatically-in-supabase-5f5o) - WebSearch for updated_at triggers

### Tertiary (LOW confidence)
- [Empty State UI Pattern Examples](https://mobbin.com/glossary/empty-state) - WebSearch for design patterns
- [React Skeleton Loader Comparison](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/) - WebSearch for library comparison

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend and React Email verified with official docs, Supabase Storage API verified, skeleton loader verified with GitHub
- Architecture: HIGH - Patterns verified with official sources, existing codebase patterns inspected
- Pitfalls: MEDIUM - Email client compatibility from WebSearch (not tested), file copy permissions from codebase experience

**Research date:** 2026-02-03
**Valid until:** 30 days (stable ecosystem, no fast-moving changes expected)
