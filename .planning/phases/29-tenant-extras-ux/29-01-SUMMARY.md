---
phase: 29-tenant-extras-ux
plan: 01
subsystem: notifications
tags: [resend, react-email, push, email, tenant, tickets]

# Dependency graph
requires:
  - phase: 24-push-notifications
    provides: Push notification infrastructure (sendNotification, web-push)
  - phase: 26-tenant-portal-core
    provides: Ticket system with messages, portal types, middleware
provides:
  - Resend email client singleton
  - Email sending helper with fire-and-forget pattern
  - React Email templates for ticket notifications
  - Tenant notification triggers (push + email)
  - Admin ticket API endpoints (list, status, messages)
affects: [29-02, tenant-portal, admin-dashboard]

# Tech tracking
tech-stack:
  added:
    - resend@6.9.1
    - "@react-email/components@1.0.6"
  patterns:
    - React Email templates with inline styles
    - Dual-channel notifications (push + email fallback)
    - Fire-and-forget notification dispatch

key-files:
  created:
    - src/lib/email/client.ts
    - src/lib/email/send.ts
    - src/emails/ticket-status-changed.tsx
    - src/emails/ticket-reply-received.tsx
    - src/lib/notifications/tenant-triggers.ts
    - src/app/api/admin/tickets/route.ts
    - src/app/api/admin/tickets/[id]/status/route.ts
    - src/app/api/admin/tickets/[id]/messages/route.ts
  modified:
    - package.json

key-decisions:
  - "Resend email client with graceful API key handling (logs warning, doesn't crash)"
  - "Fire-and-forget pattern for both push and email (never throws, logs errors)"
  - "Reuse existing notification types (work_order_status) for ticket notifications"
  - "Admin API uses kewa role check (legacy Role type) for consistency"
  - "German email content with inline styles for email client compatibility"

patterns-established:
  - "React Email templates with inline styles in src/emails/"
  - "Email sending via sendEmail() helper with success/error result"
  - "Tenant notification triggers following existing triggers.ts pattern"

# Metrics
duration: 18min
completed: 2026-02-03
---

# Phase 29-01: Tenant Ticket Notifications Summary

**Resend email integration with React Email templates, dual-channel tenant notifications (push + email), and admin ticket management API**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-03T12:00:00Z
- **Completed:** 2026-02-03T12:18:00Z
- **Tasks:** 3
- **Files created:** 8

## Accomplishments

- Resend email client with fire-and-forget pattern for graceful degradation
- React Email templates for ticket status changes and operator replies (German content)
- Tenant notification triggers sending both push and email
- Admin ticket API endpoints for operators to manage tickets and send messages
- Notifications wired to status changes and operator replies

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create email templates** - `d021fd6` (feat)
2. **Task 2: Create tenant notification triggers** - `1991556` (feat)
3. **Task 3: Wire notifications into ticket API endpoints** - `acc68f3` (feat)

## Files Created/Modified

- `src/lib/email/client.ts` - Resend client singleton with API key warning
- `src/lib/email/send.ts` - sendEmail helper with fire-and-forget pattern
- `src/emails/ticket-status-changed.tsx` - Status change email template (German)
- `src/emails/ticket-reply-received.tsx` - Reply notification email template (German)
- `src/lib/notifications/tenant-triggers.ts` - notifyTenantTicketStatusChange, notifyTenantTicketReply
- `src/app/api/admin/tickets/route.ts` - GET all tickets with filters
- `src/app/api/admin/tickets/[id]/status/route.ts` - PATCH ticket status
- `src/app/api/admin/tickets/[id]/messages/route.ts` - GET/POST messages

## Decisions Made

1. **Resend API key handling** - Logs warning if missing but doesn't crash app, allows graceful degradation
2. **Notification type reuse** - Uses existing `work_order_status` type for ticket notifications (simpler than extending enum)
3. **Admin role check** - Uses `kewa` role (legacy) for consistency with existing codebase patterns
4. **Email styles** - Inline styles only for maximum email client compatibility
5. **Dual-channel with fallback** - Push notification first, always send email regardless of push result

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External service configuration required.**

### Resend Email Service

1. **Get API Key:**
   - Go to [Resend Dashboard](https://resend.com/api-keys)
   - Create API Key with send permissions

2. **Add Environment Variable:**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   ```

3. **Verify Domain (recommended for production):**
   - Go to Resend Dashboard -> Domains -> Add Domain
   - Add DNS records as instructed
   - Verify domain ownership

4. **Optional - Custom From Address:**
   ```bash
   RESEND_FROM_EMAIL="KEWA Support <support@yourdomain.com>"
   ```

### Verification

After setting up, test email sending:
- Change a ticket status in admin panel
- Check tenant's email inbox for notification
- Check server logs for delivery status

## Issues Encountered

- **Windows Turbopack build race condition** - `npm run build` fails intermittently with ENOENT errors on temp files. This is a known Next.js 16 Turbopack issue on Windows. Type checking passes successfully. Does not affect production deployment (CI uses Linux).

## Next Phase Readiness

- Email infrastructure ready for additional templates
- Notification patterns established for future tenant notifications
- Admin ticket API ready for dashboard integration

---
*Phase: 29-tenant-extras-ux*
*Completed: 2026-02-03*
