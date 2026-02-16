# Phase 24: Push Notifications — Context

## Phase Scope

**Goal**: Users receive timely push notifications for workflow events with preference controls.
**Requirements**: PUSH-01 through PUSH-12
**Plans**: 4 (24-01 through 24-04)

## Decisions

### 1. Notification Center UX

- **Bell icon** in top nav with **dropdown panel** showing recent grouped notifications
- "Alle anzeigen" link at bottom navigates to full `/notifications` page
- **Badge count**: exact unread count with "9+" cap
- **Grouped by entity**: multiple notifications on same entity collapse into one group with count (e.g., "Arbeitsauftrag #42 — 3 Aktualisierungen")
- **"Alle gelesen" button** available in both dropdown header and full page
- **Full page** has filters: by notification type and read/unread status
- **90-day auto-purge**: notifications automatically deleted after 90 days, no manual delete
- Empty state: "Keine Benachrichtigungen" when none exist

### 2. Event Trigger Coverage

**Triggers are limited to three categories:**

| Event | Urgency | Description |
|-------|---------|-------------|
| Work order status change | normal | sent, accepted, rejected (PUSH-03) |
| Approval needed | urgent | Invoice approval, change order approval (PUSH-04) |
| Acceptance deadline reminder | urgent | 24 hours before deadline expires (PUSH-09) |

**Explicitly excluded** from Phase 24 triggers:
- Inspection events (users are already in the app during inspections)
- Knowledge base events (passive resource, no push)
- Supplier/procurement events (dashboard-only visibility)
- Task assignments, budget warnings, comments

**Failed delivery**: no retry. Push is best-effort. Notification appears in in-app center on next login.

### 3. Role-Based Notification Routing

**Model**: Role defines which notification types are *available*. Users opt-in to the ones they want.

Existing RBAC system (5 roles with permissions) is already in place. Notification preferences layer on top.

| Role | Available Notification Types |
|------|------------------------------|
| admin | All types (WO status, approvals, deadlines) |
| property_manager | All types (WO status, approvals, deadlines) |
| accounting | Approvals, deadlines |
| tenant | None (no push notifications) |
| external_contractor | Work order events only (assigned, status changes on their WOs) |

- Users see only the notification types their role makes available
- Users explicitly enable/disable each available type (opt-in model)
- Contractors use the **same notification center UI** as internal users (role scoping handles content)

### 4. Digest & Urgency Behavior

**Urgency levels** (auto-derived from event type, not configurable):
- `urgent`: approval requests, deadline reminders
- `normal`: work order status changes
- `info`: not used in Phase 24 (reserved for future)

**Quiet hours** (PUSH-12):
- User sets start/end time (e.g., 20:00-07:00)
- **Urgent bypasses quiet hours** — always pushes immediately
- Normal notifications held until quiet hours end

**Daily digest** (PUSH-10):
- **Global toggle** — applies to all notification types when enabled
- Fires a single summary push: "Sie haben X ungelesene Benachrichtigungen"
- Click opens notification center
- **User-configurable time** (default 08:00)
- Urgent notifications still push immediately even in digest mode

### 5. Contractor Notifications (PUSH-08)

- Contractors have `external_contractor` role and can log in with email/password
- They can register service workers and receive browser push
- Available notification types: work order assignments and status changes only
- Same notification center UI as internal users
- Role scoping ensures they only see their own entities

## Deferred Ideas

None captured during discussion.

## Technical Notes for Research

- Existing RBAC: `roles`, `permissions`, `role_permissions` tables with `get_user_with_permissions()` function
- Auth methods: pin, email_password, magic_link — contractors use email_password
- Stack recommendation from research: `web-push` library + Service Worker + Supabase Realtime for in-app
- VAPID keys stored in env vars
- Supabase Realtime available for real-time in-app notification updates

---
*Created: 2026-01-28*
*Areas discussed: Notification Center UX, Event Trigger Coverage, Contractor Scope, Digest & Urgency*
