# Phase 26: Tenant Portal Core — Context

## Phase Goal

Tenants can register, log in, create maintenance tickets with category/urgency, communicate via message threads, and view a dashboard — all within an isolated, German-language, mobile-first portal.

## Decisions

### 1. Portal Architecture & Isolation

- **Same Next.js app** with `/(portal)` route group — independent layout, shared types/Supabase client, single repo, single deployment
- **Fully independent UI** — own layout, own header, no shared navigation chrome with operator app. Tenant never sees operator UI
- **Operator view-only access** — if a logged-in KEWA operator navigates to `/portal`, they see the tenant portal in read-only mode (for support purposes)
- **No hardcoded company name** — company name stored in a settings table, editable via Admin UI settings page. Default: "KEWA AG"

### 2. Settings Table & Admin UI

- New `app_settings` table (key-value) for company name and future configurable values
- Admin settings page where operator can update company name
- Ticket categories are also admin-configurable (not hardcoded)
- Default categories: Heizung, Wasser/Sanitaer, Elektrik, Allgemein
- Operators can add, rename, or disable categories

### 3. Tenant Registration & Onboarding

- **Invite link auto-generated** when operator creates a tenant record (from unit management)
- **Email + password authentication** — tenant sets email and password during registration
- **Minimal registration** — only email + password required. Name/phone added later in profile
- **PWA install prompt** — natural browser behavior, no custom install banner
- **QR code for multi-device** — persistent QR code displayed in tenant profile/settings. Scanning logs in the same account on another device (not a new account)
- **No self-registration** — tenant must be in the tenant register (linked to a unit) to access the portal

### 4. Tenant Lifecycle & Access Control

- **Manual deactivation** — KEWA operator manually deactivates tenant on move-out. No automatic date-based deactivation
- **Deactivated tenant** — cannot log in, existing sessions invalidated
- **Internal unit transfer** — operator updates tenant's unit assignment. Old tickets remain linked to the original unit. New tickets go to the new unit
- **Data isolation** — tenant can only see their own tickets and messages. Zero tolerance for cross-tenant data leaks

### 5. Ticket Status Model

- **3 statuses**: Offen → In Bearbeitung → Geschlossen
- **Offen** — tenant creates ticket, initial state
- **In Bearbeitung** — auto-transitions when KEWA sends first reply message
- **Geschlossen** — KEWA marks as done; auto-closes after 7 days with notification to tenant if no response
- **Tenant can cancel** — only when status is Offen (before KEWA picks up)
- **No reopen** — closed tickets cannot be reopened. Tenant creates a new ticket

### 6. Ticket Urgency & Notfall Behavior

- **3 urgency levels**: Notfall, Dringend, Normal
- **Notfall** triggers: visual red highlight in operator view + immediate push notification to all operators
- Dringend and Normal have no special notification behavior (standard workflow)

### 7. Photo Attachments

- **Max 5 photos** at ticket creation
- **Additional photos** can be attached in follow-up messages (no limit per message)
- KEWA operators can attach **photos + PDFs** in their replies

### 8. Message Threads

- **Chat bubble style** — WhatsApp-like, tenant messages on right, KEWA messages on left
- **Sent + read indicators** — single checkmark for sent, double checkmark for read
- **Exact timestamps with date grouping** — messages grouped by date (Heute, Gestern, DD.MM.YYYY), each message shows HH:MM
- **No typing indicator** — no real-time "typing..." status

### 9. Seed Data

- **All existing tables** — properties, units, work orders, suppliers, inspections, knowledge base, change orders, etc.
- **New tenant tables** — tenant users, tickets, ticket messages, ticket attachments
- Realistic German-language mock data to validate the entire app

## Deferred Ideas (Out of Phase 26 Scope)

- **Full SaaS multi-tenancy** — multiple property management companies on one instance. Milestone-level change
- **Intelligent onboarding wizard** — new company setup flow. Future milestone
- **Remove all hardcoded references** across existing app — broader refactoring effort
- **Docker containerization** — deployment concern, not feature development
- **Mock data for future tables** — seed data covers existing + Phase 26 tables only

## Scope Boundaries

Phase 26 delivers:
1. Database schema (tickets, messages, attachments, tenant users, app settings, ticket categories)
2. Tenant auth (invite-based registration, email/password login, session validation, route protection, data isolation, QR multi-device)
3. Ticket CRUD (category, urgency, status workflow, photo attachments, message threads with chat UI)
4. Tenant dashboard (open ticket count, recent messages, unit info)
5. Admin settings UI (company name, ticket categories)
6. Seed data for all tables
7. Mobile-first, German-language, independent portal layout

Phase 26 does NOT deliver:
- Email/push notifications for ticket updates (Phase 29)
- Ticket-to-work-order conversion (Phase 29)
- Tenant profile management (Phase 29)
- Offline capability (Phase 28)
- PWA installation (Phase 27)

---

*Created: 2026-01-29*
*Gray areas discussed: Portal isolation, Registration & onboarding, Ticket lifecycle, Message thread UX*
