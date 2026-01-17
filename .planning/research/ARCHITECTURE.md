# Architecture Research: KEWA Property Task Management App

**Researched:** 2026-01-16
**Domain:** Next.js 15 + Supabase Task Management
**Confidence:** HIGH (verified with official Supabase docs and established Next.js patterns)

## Executive Summary

The KEWA Property Task Management App should follow a layered Next.js App Router architecture with Supabase as the backend. The hierarchical data model (Building -> Units -> Projects -> Tasks) maps cleanly to relational tables with foreign key relationships. For the simple PIN-based authentication requirement, a custom lightweight session system using HTTP-only cookies is more appropriate than Supabase Auth.

**Key architectural decisions:**
1. **Database-first design**: Define Supabase schema to match the hierarchical domain model with proper foreign keys
2. **Server Actions for mutations**: Use Next.js Server Actions for all database writes, leveraging Supabase service role for bypassing RLS complexity
3. **Custom PIN auth**: Implement simple cookie-based sessions without Supabase Auth (simpler for 2-user system)
4. **Supabase Storage**: Organized by task ID for photos and audio files
5. **Realtime via Postgres Changes**: For task status updates (acceptable scale for 2 users)

## System Components

### 1. Presentation Layer (Next.js App Router)

**Responsibility:** Routing, UI rendering, form handling, session management

```
app/
├── (auth)/
│   └── login/page.tsx           # PIN entry screen
├── (app)/
│   ├── layout.tsx               # Auth-protected layout with role context
│   ├── dashboard/page.tsx       # Role-based dashboard redirect
│   ├── kewa/                    # KEWA AG views
│   │   ├── tasks/page.tsx       # Task management (CRUD)
│   │   ├── projects/page.tsx    # Project overview
│   │   ├── reports/page.tsx     # Weekly reports
│   │   └── settings/page.tsx    # Visibility settings
│   └── imeri/                   # Imeri (handyman) views
│       ├── tasks/page.tsx       # Assigned tasks list
│       └── task/[id]/page.tsx   # Task detail with file upload
└── api/
    └── auth/
        ├── login/route.ts       # PIN verification
        └── logout/route.ts      # Session termination
```

### 2. Business Logic Layer (lib/)

**Responsibility:** Database queries, mutations, validation, utilities

```
lib/
├── supabase/
│   ├── client.ts               # Browser client (anon key)
│   ├── server.ts               # Server client (service role)
│   └── admin.ts                # Admin operations (service role)
├── auth/
│   ├── session.ts              # Cookie-based session management
│   └── middleware.ts           # Route protection
├── tasks/
│   ├── queries.ts              # Task fetching (with relations)
│   ├── mutations.ts            # Task CRUD operations
│   └── types.ts                # Task-related TypeScript types
├── projects/
│   ├── queries.ts
│   ├── mutations.ts
│   └── types.ts
├── reports/
│   ├── generator.ts            # Weekly report generation
│   └── types.ts
└── storage/
    ├── upload.ts               # File upload utilities
    └── types.ts
```

### 3. Shared Components Layer

**Responsibility:** Reusable UI components

```
components/
├── ui/                         # Base components (Button, Input, Card, etc.)
├── tasks/
│   ├── TaskCard.tsx
│   ├── TaskList.tsx
│   ├── TaskForm.tsx
│   └── StatusBadge.tsx
├── files/
│   ├── PhotoUpload.tsx
│   ├── PhotoGallery.tsx
│   └── AudioPlayer.tsx
├── layout/
│   ├── Header.tsx
│   ├── Navigation.tsx
│   └── RoleSwitcher.tsx        # (if needed for dev)
└── reports/
    └── ReportPreview.tsx
```

### 4. Data Layer (Supabase)

**Responsibility:** PostgreSQL database, file storage, realtime subscriptions

- **Database:** PostgreSQL with foreign key relationships
- **Storage:** Buckets for task-related files
- **Realtime:** Postgres Changes for task status updates

## Database Schema

### Schema Design (Supabase PostgreSQL)

```sql
-- Users table (simple, no Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kewa', 'imeri')),
  pin_hash TEXT NOT NULL,  -- bcrypt hashed 4-6 digit PIN
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Building (single building, but extensible)
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units (13 apartments + 9 common areas = 22 total)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Wohnung 1.OG links", "Keller"
  type TEXT NOT NULL CHECK (type IN ('apartment', 'common_area')),
  floor INTEGER,                         -- Optional: for sorting
  sort_order INTEGER DEFAULT 0,          -- Custom sort order
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (work scopes per unit)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                   -- e.g., "Badezimmer Renovation"
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  visible_to_imeri BOOLEAN DEFAULT true, -- KEWA can hide projects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (individual work items)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,                        -- Optional audio instruction from KEWA
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority INTEGER DEFAULT 0,            -- Higher = more urgent
  visible_to_imeri BOOLEAN DEFAULT true, -- KEWA can hide tasks
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Photos (max 2 per task, from either role)
CREATE TABLE task_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,            -- Path in Supabase Storage
  uploaded_by UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('before', 'after', 'reference')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (for custom PIN auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,            -- Random session token
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_units_building ON units(building_id);
CREATE INDEX idx_projects_unit ON projects(unit_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_photos_task ON task_photos(task_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### Row Level Security Strategy

**Recommended approach:** Use RLS for SELECT operations only; route all mutations through Server Actions with service role key.

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Since we're not using Supabase Auth, RLS policies would need
-- custom JWT handling or service role bypass.
--
-- RECOMMENDED: Use service_role key for ALL database operations
-- and handle authorization in Server Actions.
--
-- This is simpler for a 2-user system and avoids RLS complexity.
```

**Why bypass RLS for this app:**
1. Only 2 users - complex RLS overhead not justified
2. Custom PIN auth doesn't integrate with `auth.uid()`
3. Server Actions provide natural authorization checkpoint
4. All mutations already server-side (Next.js Server Actions)

### Querying Hierarchical Data

Supabase automatically detects foreign key relationships for nested queries:

```typescript
// Fetch building with all units, projects, and tasks
const { data } = await supabase
  .from('buildings')
  .select(`
    id,
    name,
    units (
      id,
      name,
      type,
      projects (
        id,
        title,
        status,
        visible_to_imeri,
        tasks (
          id,
          title,
          status,
          priority,
          visible_to_imeri,
          due_date
        )
      )
    )
  `)
  .single();

// Filter for Imeri (only visible items)
const { data } = await supabase
  .from('projects')
  .select(`
    id,
    title,
    unit:units(name),
    tasks (
      id,
      title,
      status,
      priority
    )
  `)
  .eq('visible_to_imeri', true)
  .eq('tasks.visible_to_imeri', true);
```

**Source:** [Supabase Joins and Nesting Documentation](https://supabase.com/docs/guides/database/joins-and-nesting)

## File Storage Strategy

### Bucket Organization

```
Storage Buckets:
├── task-photos/          # Task photos (before/after/reference)
│   └── {task_id}/
│       ├── before-{uuid}.jpg
│       ├── after-{uuid}.jpg
│       └── reference-{uuid}.jpg
└── task-audio/           # Audio instructions from KEWA
    └── {task_id}/
        └── instruction-{uuid}.webm
```

### Storage Policies

Since we're using service role for mutations, storage policies can be permissive:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('task-photos', 'task-photos', false),
  ('task-audio', 'task-audio', false);

-- For service role access, no RLS policies needed
-- Service role bypasses all RLS

-- If using anon key for downloads, add SELECT policy:
CREATE POLICY "Allow authenticated read" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('task-photos', 'task-audio')
);
```

### Upload Implementation Pattern

```typescript
// lib/storage/upload.ts
import { createServerClient } from '@/lib/supabase/server';

export async function uploadTaskPhoto(
  taskId: string,
  file: File,
  type: 'before' | 'after' | 'reference',
  uploadedBy: string
): Promise<{ path: string; error: Error | null }> {
  const supabase = createServerClient();

  // Validate file
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { path: '', error: new Error('Invalid file type') };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { path: '', error: new Error('File too large (max 5MB)') };
  }

  const fileName = `${type}-${crypto.randomUUID()}.${file.type.split('/')[1]}`;
  const storagePath = `${taskId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('task-photos')
    .upload(storagePath, file);

  if (uploadError) {
    return { path: '', error: uploadError };
  }

  // Record in database
  await supabase.from('task_photos').insert({
    task_id: taskId,
    storage_path: storagePath,
    uploaded_by: uploadedBy,
    type,
  });

  return { path: storagePath, error: null };
}
```

**Source:** [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)

## Data Flow

### Authentication Flow (Custom PIN)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────>│  API Route  │────>│  Database   │
│  (PIN Form) │     │ /api/login  │     │  (sessions) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Submit PIN    │                   │
       │──────────────────>│                   │
       │                   │  2. Verify hash   │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │  3. Create session│
       │                   │──────────────────>│
       │  4. Set cookie    │<──────────────────│
       │<──────────────────│                   │
       │                   │                   │
```

**Implementation:**
```typescript
// app/api/auth/login/route.ts
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { pin, role } = await request.json();
  const supabase = createServerClient();

  // Find user by role
  const { data: user } = await supabase
    .from('users')
    .select('id, pin_hash, role')
    .eq('role', role)
    .single();

  if (!user || !await bcrypt.compare(pin, user.pin_hash)) {
    return Response.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  // Create session
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabase.from('sessions').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });

  return Response.json({ role: user.role });
}
```

### Task Creation Flow (KEWA)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   KEWA UI   │────>│Server Action│────>│  Supabase   │
│ (Task Form) │     │ createTask  │     │  (tasks)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Form submit   │                   │
       │──────────────────>│                   │
       │                   │  2. Validate      │
       │                   │  3. Auth check    │
       │                   │  4. Insert task   │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │  5. revalidatePath│
       │  6. UI updates    │                   │
       │<──────────────────│                   │
```

**Implementation:**
```typescript
// lib/tasks/mutations.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(10).default(0),
  due_date: z.string().optional(),
  visible_to_imeri: z.boolean().default(true),
});

export async function createTask(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'kewa') {
    throw new Error('Unauthorized');
  }

  const validated = CreateTaskSchema.parse({
    project_id: formData.get('project_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: Number(formData.get('priority') || 0),
    due_date: formData.get('due_date'),
    visible_to_imeri: formData.get('visible_to_imeri') === 'true',
  });

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('tasks')
    .insert(validated)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/kewa/tasks');
  return data;
}
```

### Task Completion Flow (Imeri)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Imeri UI   │────>│Server Action│────>│  Supabase   │────>│  Realtime   │
│ (Complete)  │     │completeTask │     │  (tasks)    │     │ (broadcast) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │  1. Click done    │                   │                   │
       │──────────────────>│                   │                   │
       │                   │  2. Update status │                   │
       │                   │──────────────────>│                   │
       │                   │                   │  3. Trigger       │
       │                   │                   │─────────────────->│
       │                   │                   │                   │
       │                   │                   │     4. KEWA gets  │
       │                   │                   │     notification  │
       │                   │<──────────────────│                   │
       │  5. UI updates    │                   │                   │
       │<──────────────────│                   │                   │
```

### Realtime Subscription Setup

```typescript
// hooks/useTaskSubscription.ts
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useTaskSubscription(
  onUpdate: (task: Task) => void
) {
  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel('task-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          onUpdate(payload.new as Task);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
```

**Source:** [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

## Component Dependencies

### Dependency Graph

```
                    ┌─────────────┐
                    │   Supabase  │
                    │   Project   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         v                 v                 v
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  Database │    │  Storage  │    │ Realtime  │
   │  Schema   │    │  Buckets  │    │ Publication│
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         └────────┬───────┴────────────────┘
                  │
                  v
         ┌─────────────────┐
         │  Supabase       │
         │  Client Setup   │
         │  (lib/supabase) │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    v             v             v
┌───────┐   ┌─────────┐   ┌─────────┐
│ Auth  │   │ Queries │   │ Storage │
│Session│   │Mutations│   │ Upload  │
└───┬───┘   └────┬────┘   └────┬────┘
    │            │             │
    └────────────┼─────────────┘
                 │
                 v
         ┌─────────────────┐
         │   UI Components │
         │   (pages, etc)  │
         └─────────────────┘
```

### Critical Path Dependencies

| Component | Depends On | Blocks |
|-----------|------------|--------|
| Database Schema | Supabase Project | Everything |
| Supabase Client | Database Schema | Auth, Queries, Storage |
| Auth/Session | Supabase Client | All protected routes |
| Base UI Components | Nothing | Page components |
| Task Queries | Auth, Schema | Task UI |
| Storage Upload | Auth, Buckets | File UI |
| Realtime | Publication config | Live updates |
| Reports | Task Queries | Report UI |

## Suggested Build Order

Based on dependencies and incremental value delivery:

### Phase 1: Foundation
**Goal:** Working Supabase backend + authentication

1. **Supabase Project Setup**
   - Create project
   - Configure environment variables
   - Set up local development (optional: Supabase CLI)

2. **Database Schema**
   - Create all tables with foreign keys
   - Add indexes
   - Seed initial data (building, units, 2 users)

3. **Supabase Client Configuration**
   - `lib/supabase/client.ts` (browser)
   - `lib/supabase/server.ts` (server with service role)

4. **Custom Auth System**
   - Session management (`lib/auth/session.ts`)
   - Login API route
   - Logout API route
   - Middleware for route protection

**Deliverable:** Users can log in with PIN and see role-appropriate dashboard

### Phase 2: Core Data Operations
**Goal:** KEWA can manage tasks, Imeri can view them

5. **Base UI Components**
   - Layout components (Header, Navigation)
   - UI primitives (Button, Input, Card, etc.)
   - Loading and error states

6. **Unit/Project/Task Queries**
   - Hierarchical data fetching
   - Role-based filtering (visible_to_imeri)

7. **KEWA Task Management**
   - Task list view
   - Task creation form
   - Task editing
   - Visibility toggle

8. **Imeri Task View**
   - Filtered task list
   - Task detail page
   - Status update action

**Deliverable:** Full task CRUD with role separation

### Phase 3: Files and Media
**Goal:** Photo and audio support

9. **Storage Buckets**
   - Create buckets in Supabase
   - Configure access (service role bypass)

10. **Photo Upload**
    - Upload component with preview
    - Before/after photo support
    - Photo gallery component

11. **Audio Playback**
    - Audio player component
    - KEWA audio upload (future or separate)

**Deliverable:** Tasks can have photos and audio instructions

### Phase 4: Real-time and Reports
**Goal:** Live updates + weekly summaries

12. **Realtime Setup**
    - Enable publication on tasks table
    - Subscription hook
    - UI integration for live status updates

13. **Report Generation**
    - Weekly summary query
    - Report formatting
    - Export/print capability

**Deliverable:** Full application with all features

## Open Questions

### LOW Confidence Items (Need Validation)

1. **Audio Recording in Browser**
   - How should KEWA record audio instructions?
   - WebM vs other formats for browser recording
   - Need to research MediaRecorder API patterns

2. **Report Scheduling**
   - Should reports auto-generate weekly or on-demand?
   - If scheduled: Supabase Edge Functions or external cron?

3. **Offline Support**
   - Is offline access needed for Imeri?
   - If yes: PWA + local storage strategy needed

### Design Decisions to Confirm

1. **PIN Length:** 4-digit vs 6-digit?
2. **Session Duration:** 7 days appropriate?
3. **Photo Limit Enforcement:** Database constraint or application level?

## Sources

### Primary (HIGH Confidence)
- [Supabase Joins and Nesting Documentation](https://supabase.com/docs/guides/database/joins-and-nesting) - Hierarchical query patterns
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - File security patterns
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) - Subscription setup
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS patterns

### Secondary (MEDIUM Confidence)
- [Next.js 15 Folder Structure Best Practices](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji) - Project organization
- [MakerKit Next.js Supabase Architecture](https://makerkit.dev/docs/next-supabase/architecture/architecture) - Layered architecture patterns
- [Supabase Storage Upload Patterns](https://kodaschool.com/blog/next-js-and-supabase-how-to-store-and-serve-images) - File upload implementation

### Architecture Patterns Verified
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Security and scaling
- [Server Actions with Supabase](https://makerkit.dev/docs/next-supabase/data-fetching/server-actions) - Mutation patterns
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) - Cookie security

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Database Schema | HIGH | Standard relational design, verified with Supabase docs |
| Supabase Client Setup | HIGH | Well-documented in official quickstart |
| Server Actions Pattern | HIGH | Recommended by Supabase + Next.js docs |
| Custom PIN Auth | MEDIUM | Standard cookie pattern, but custom implementation |
| Storage Organization | HIGH | Standard bucket patterns from Supabase docs |
| Realtime Setup | HIGH | Official documentation clear |
| Build Order | MEDIUM | Based on dependency analysis, may need adjustment |

---

**Research Date:** 2026-01-16
**Valid Until:** 2026-02-16 (30 days - stable technologies)
