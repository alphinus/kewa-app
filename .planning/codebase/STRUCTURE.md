# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
kewa-imeri-app/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # API route handlers
│   │   ├── dashboard/         # Internal staff dashboard
│   │   ├── contractor/        # External contractor portal
│   │   ├── templates/         # Template management pages
│   │   ├── renovation-projects/ # Renovation project pages
│   │   ├── login/             # Authentication page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Root redirect to /login
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable React components
│   │   ├── ui/               # Base UI primitives (Button, Card, Input)
│   │   ├── navigation/       # Header, MobileNav
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── tasks/            # Task management components
│   │   ├── photos/           # Photo gallery, upload, before/after
│   │   ├── audio/            # Audio recording and playback
│   │   ├── building/         # Building visualization
│   │   ├── templates/        # Template editor components
│   │   ├── work-orders/      # Work order forms and dialogs
│   │   ├── costs/            # Cost management components
│   │   ├── comments/         # Commenting system
│   │   ├── parking/          # Parking management
│   │   ├── projects/         # Project cards and selectors
│   │   ├── reports/          # Report generation
│   │   ├── units/            # Unit detail components
│   │   ├── upload/           # File upload utilities
│   │   └── admin/            # Admin-only components
│   ├── lib/                   # Shared utilities and business logic
│   │   ├── supabase/         # Supabase client (client.ts, server.ts)
│   │   ├── costs/            # Cost queries and formatters
│   │   ├── templates/        # Template application logic
│   │   ├── contractor/       # Contractor portal utilities
│   │   ├── work-orders/      # Work order helpers
│   │   ├── dashboard/        # Dashboard data queries
│   │   ├── comments/         # Comment utilities
│   │   ├── parking/          # Parking utilities
│   │   ├── storage/          # File storage helpers
│   │   ├── units/            # Unit utilities
│   │   ├── api/              # API client utilities
│   │   ├── pdf/              # PDF generation (work-order-pdf.tsx)
│   │   ├── session.ts        # JWT session validation
│   │   ├── auth.ts           # Authentication (bcrypt, session creation)
│   │   ├── permissions.ts    # RBAC permission utilities
│   │   ├── audit.ts          # Audit logging utilities
│   │   ├── magic-link.ts     # Magic link token management
│   │   ├── imageCompression.ts # Client-side image compression
│   │   ├── transcription.ts  # Audio transcription
│   │   └── utils.ts          # General utilities (cn function)
│   ├── hooks/                 # Custom React hooks
│   │   └── useSession.ts     # Client-side session hook
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts          # Enum types and base types
│   │   ├── database.ts       # Database entity types
│   │   ├── auth.ts           # Authentication types
│   │   ├── templates.ts      # Template system types
│   │   ├── work-order.ts     # Work order types
│   │   ├── comments.ts       # Comment types
│   │   └── timeline.ts       # Timeline types
│   └── proxy.ts              # Auth middleware (Next.js 16 proxy)
├── supabase/
│   └── migrations/           # SQL migration files (001-044)
├── public/                    # Static assets
├── .planning/                 # Planning and documentation
│   ├── codebase/             # Codebase analysis docs
│   ├── phases/               # Implementation phase plans
│   ├── research/             # Research documents
│   ├── milestones/           # Milestone tracking
│   └── todos/                # Todo management (done, pending)
├── package.json              # Dependencies
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.mjs         # ESLint configuration
└── postcss.config.mjs        # PostCSS configuration
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router file-based routing
- Contains: Page components, layouts, API route handlers
- Key files: `layout.tsx`, `page.tsx`, `route.ts`

**`src/app/api/`:**
- Purpose: Backend API endpoints
- Contains: Route handlers for CRUD operations
- Key patterns: RESTful resources (`/api/tasks`, `/api/tasks/[id]`)

**`src/app/dashboard/`:**
- Purpose: Internal staff dashboard pages
- Contains: Task management, costs, projects, buildings, reports
- Key files: `layout.tsx` (shared nav), `page.tsx` (home)

**`src/app/contractor/`:**
- Purpose: External contractor portal
- Contains: Work order management for contractors
- Key files: `[token]/page.tsx`, `[token]/[workOrderId]/page.tsx`

**`src/components/`:**
- Purpose: Reusable React components
- Contains: UI primitives, feature-specific components
- Organization: By feature domain (tasks, photos, costs, etc.)

**`src/components/ui/`:**
- Purpose: Base UI building blocks
- Contains: Button, Card, Input components
- Pattern: Prop-based variants, Tailwind CSS styling

**`src/lib/`:**
- Purpose: Shared utilities and business logic
- Contains: Supabase clients, query helpers, auth utilities
- Organization: By feature domain (costs, templates, etc.)

**`src/lib/supabase/`:**
- Purpose: Supabase client initialization
- Contains: Browser client (client.ts), Server client (server.ts)
- Usage: Import and call createClient() in API routes/components

**`src/types/`:**
- Purpose: TypeScript type definitions
- Contains: Database entities, API types, enums
- Key files: `database.ts` (main entities), `index.ts` (enums)

**`supabase/migrations/`:**
- Purpose: Database schema evolution
- Contains: SQL migration files numbered sequentially
- Key files: `001_initial_schema.sql` (base tables)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (fonts, global styles)
- `src/app/page.tsx`: Root page (redirects to /login)
- `src/app/dashboard/page.tsx`: Dashboard home page
- `src/proxy.ts`: Auth middleware for protected routes

**Configuration:**
- `package.json`: Dependencies and scripts
- `next.config.ts`: Next.js settings (standalone, turbopack)
- `tsconfig.json`: TypeScript compiler options
- `.env.local`: Environment variables (not committed)

**Core Logic:**
- `src/lib/session.ts`: JWT session validation
- `src/lib/auth.ts`: PIN/password authentication
- `src/lib/permissions.ts`: RBAC permission checking
- `src/lib/supabase/server.ts`: Server-side Supabase client

**Testing:**
- No test files detected (vitest/jest not configured)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (`TaskList.tsx`, `PhotoGallery.tsx`)
- Utilities: camelCase (`imageCompression.ts`, `magic-link.ts`)
- Types: camelCase (`database.ts`, `auth.ts`)

**Directories:**
- lowercase with hyphens for multi-word (`work-orders`, `magic-link`)
- Features grouped by domain (`tasks/`, `photos/`, `costs/`)
- Dynamic routes: `[param]` brackets (`[id]`, `[token]`)

**Components:**
- PascalCase function names (`TaskList`, `PhotoGallery`)
- Props interface: `{ComponentName}Props`
- Export as named or default based on usage

**Types:**
- Interface for objects: `Task`, `User`, `Project`
- Type alias for unions: `TaskStatus`, `Priority`
- Input types: `Create{Entity}Input`, `Update{Entity}Input`
- Response types: `{Entity}Response`, `{Entity}sResponse` (plural)

## Where to Add New Code

**New Feature (e.g., "notifications"):**
1. Create page: `src/app/dashboard/notifications/page.tsx`
2. Create components: `src/components/notifications/`
3. Create API routes: `src/app/api/notifications/route.ts`
4. Add types: `src/types/notifications.ts` or extend `database.ts`
5. Add lib utilities: `src/lib/notifications/` if complex logic needed

**New Component:**
- UI primitive: `src/components/ui/{component}.tsx`
- Feature component: `src/components/{feature}/{Component}.tsx`

**New API Endpoint:**
- Collection: `src/app/api/{resource}/route.ts` (GET all, POST create)
- Single item: `src/app/api/{resource}/[id]/route.ts` (GET, PUT, DELETE)
- Actions: `src/app/api/{resource}/[id]/{action}/route.ts`

**Utilities:**
- Shared helpers: `src/lib/{feature}/` or `src/lib/{name}.ts`
- React hooks: `src/hooks/use{Name}.ts`

**Database Changes:**
- Add migration: `supabase/migrations/{next-number}_{description}.sql`
- Update types: `src/types/database.ts`

## Special Directories

**`.planning/`:**
- Purpose: Project planning and documentation
- Generated: No (manually maintained)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (build process)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (npm install)
- Committed: No (in .gitignore)

**`.vercel/`:**
- Purpose: Vercel deployment configuration
- Generated: Yes (Vercel CLI)
- Committed: No (in .gitignore)

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes
- Contents: Images, icons, favicons

**`supabase/`:**
- Purpose: Supabase project configuration
- Generated: Partially (schema)
- Committed: Yes (migrations only)

---

*Structure analysis: 2026-01-19*
