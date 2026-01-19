# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**OpenAI Whisper API:**
- Purpose: Audio transcription (German language)
- SDK/Client: Direct fetch to `https://api.openai.com/v1/audio/transcriptions`
- Auth: `OPENAI_API_KEY` environment variable
- Implementation: `src/lib/transcription.ts`
- Usage: Automatic transcription of explanation audio files for task documentation
- Timeout: 30 seconds per request

## Data Storage

**Databases:**
- Supabase PostgreSQL (cloud hosted)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client (browser): `src/lib/supabase/client.ts` using `@supabase/ssr` `createBrowserClient`
  - Client (server): `src/lib/supabase/server.ts` using `@supabase/ssr` `createServerClient`
  - Migrations: `supabase/migrations/` (29 migration files)
  - Tables: users, properties, buildings, units, rooms, projects, tasks, work_orders, partners, invoices, expenses, payments, audit_log, etc.

**File Storage:**
- Supabase Storage (4 buckets)
  - `task-photos` - Task explanation and completion photos (private)
  - `task-audio` - Voice notes and audio explanations (private)
  - `documents` - Contracts, permits, invoices PDFs (private)
  - `media` - Unified media storage (private)
- Max file sizes: 10MB (photos), 50MB (audio/media), 20MB (documents)
- Image format: WebP preferred (compressed client-side via `src/lib/imageCompression.ts`)

**Caching:**
- None (no Redis/Memcached configured)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (not Supabase Auth)
  - Implementation: `src/lib/auth.ts`, `src/lib/session.ts`
  - JWT library: `jose` (Edge-compatible)
  - Password hashing: `bcryptjs`
  - Session cookie: `session` (HTTP-only, 7-day expiry)
  - Roles: `kewa` (admin), `imeri` (property manager)
  - RBAC support: role_id, permissions array in JWT

**Magic Links:**
- Token-based external access for contractors
- Implementation: `src/lib/magic-link.ts`
- Table: `magic_link_tokens`
- Default expiry: 72 hours (configurable via `system_settings`)
- URL pattern: `/contractor/{token}`
- Status-aware expiry: Active work orders never time-expire

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog configured)

**Logs:**
- Console logging only
- Audit log table: `audit_log` for change tracking
  - Tracks: table_name, record_id, action, user_id, old_values, new_values

## CI/CD & Deployment

**Hosting:**
- Vercel (configured via `.vercel/` directory)
- Next.js standalone output mode

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SESSION_SECRET` - JWT signing secret (min 32 characters, server-only)
- `OPENAI_API_KEY` - OpenAI API key for Whisper (server-only)

**Optional env vars:**
- `NEXT_PUBLIC_APP_URL` - Base URL for magic links (defaults to localhost:3000)
- `NODE_ENV` - production/development (affects secure cookies)

**Secrets location:**
- `.env.local` (gitignored)
- Template: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (no email service, no SMS, no webhook calls)

## PDF Generation

**Service:**
- Server-side PDF generation via `@react-pdf/renderer`
- Implementation: `src/lib/pdf/work-order-pdf.tsx`
- Format: A4 work order documents in German
- Route: `src/app/api/work-orders/[id]/pdf/route.ts`

## Database Schema Highlights

**Core Entities:**
- `users` - Multi-auth support (PIN, email/password, magic link)
- `properties` - Top-level real estate entities
- `buildings` - Physical structures
- `units` - Apartments, common areas, parking spots
- `rooms` - Rooms within units
- `projects` - Work projects per unit
- `tasks` - Individual tasks within projects
- `work_orders` - Contractor assignments
- `partners` - Contractors and suppliers

**Financial:**
- `offers` - Contractor quotes
- `invoices` - Partner invoices
- `expenses` - Cash/petty cash expenses
- `payments` - Invoice payments

**Support:**
- `media` - Unified media attachments
- `audit_log` - Change tracking
- `magic_link_tokens` - External access tokens
- `system_settings` - Configuration key-value store

## API Routes Overview

**Auth:** `src/app/api/auth/`
- login, logout, register, session, magic-link/verify

**Resources:** `src/app/api/`
- units, projects, tasks, photos, audio
- work-orders (with PDF, events, send, counter-offer)
- templates (with phases, packages, tasks, dependencies, quality-gates)
- renovation-projects (with quality-gates)
- invoices, expenses, payments, costs
- contractor (token-based access)
- reports/weekly, settings, comments, parking

---

*Integration audit: 2026-01-19*
