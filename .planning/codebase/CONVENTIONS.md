# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- Components: PascalCase.tsx (e.g., `TaskList.tsx`, `WorkOrderForm.tsx`)
- Utilities/lib: kebab-case.ts (e.g., `parking-queries.ts`, `comment-queries.ts`)
- API routes: `route.ts` in directory structure matching endpoint path
- Types: kebab-case.ts (e.g., `work-order.ts`, `templates.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useSession.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `formatDate`, `validateSession`, `fetchTasks`)
- React components: PascalCase (e.g., `TaskList`, `Button`, `Card`)
- Event handlers: `handle` prefix + action (e.g., `handleSubmit`, `handleTaskChange`)
- Fetch functions: `fetch` or `load` prefix (e.g., `fetchTasks`, `loadData`)
- Format functions: `format` prefix (e.g., `formatCHF`, `formatSwissDate`)
- Translation functions: `translate` prefix (e.g., `translateWorkOrderStatus`)

**Variables:**
- Local variables: camelCase (e.g., `projectId`, `userRole`)
- Constants: UPPER_SNAKE_CASE for module-level (e.g., `SESSION_COOKIE_NAME`, `BCRYPT_ROUNDS`)
- Boolean variables: `is`/`has`/`can` prefix (e.g., `isCompleted`, `hasError`, `canAutoApprove`)

**Types:**
- Interfaces: PascalCase with descriptive suffixes (e.g., `TaskWithProject`, `CreateTaskInput`, `ErrorResponse`)
- Type aliases: PascalCase (e.g., `Priority`, `TaskStatus`, `WorkOrderStatus`)
- Props interfaces: ComponentName + `Props` suffix (e.g., `ButtonProps`, `TaskListProps`)
- API Response types: Entity + `Response` suffix (e.g., `TasksResponse`, `ProjectResponse`)

## Code Style

**Formatting:**
- ESLint with Next.js config (`eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`)
- Config: `eslint.config.mjs`
- No Prettier config detected - relies on ESLint
- Single quotes for strings
- 2-space indentation

**Linting:**
- Tool: ESLint v9 with flat config
- Rules: Next.js core-web-vitals + TypeScript recommended
- Ignored: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: bundler
- JSX: react-jsx
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. Next.js imports (`import { NextRequest, NextResponse } from 'next/server'`)
3. Third-party libraries (`import bcrypt from 'bcryptjs'`)
4. Internal `@/` aliases:
   - Components (`@/components/*`)
   - Lib utilities (`@/lib/*`)
   - Types (`@/types/*`)
   - Hooks (`@/hooks/*`)

**Path Aliases:**
- `@/*` - maps to `./src/*`
- Use absolute imports via alias, never relative paths crossing directories

**Example (from `src/app/api/tasks/route.ts`):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  TaskWithProject,
  TasksResponse,
  ErrorResponse,
} from '@/types/database'
import type { Role } from '@/types'
```

## Error Handling

**API Routes:**
- Use try-catch wrapper for entire handler
- Return typed `ErrorResponse` with `{ error: string }`
- Log errors with context: `console.error('Error description:', error)`
- HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)

**Pattern (from `src/app/api/projects/route.ts`):**
```typescript
export async function GET(request: NextRequest): Promise<NextResponse<ProjectsResponse | ErrorResponse>> {
  try {
    // Validate auth
    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Business logic...

    if (dbError) {
      console.error('Error fetching projects:', dbError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    return NextResponse.json({ projects: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Client Components:**
- State for errors: `const [error, setError] = useState<Error | null>(null)`
- Try-catch in async handlers
- User-friendly German error messages in UI

## Logging

**Framework:** `console.error` / `console.log` (native)

**Patterns:**
- Always log errors with context prefix: `console.error('Context description:', error)`
- Include route/function name in error logs
- No logging in production for non-errors (no debug/info logs)

## Comments

**When to Comment:**
- File headers with purpose and phase reference
- Complex business logic or algorithms
- API endpoint documentation (method, path, parameters, response)
- Interface/type documentation for non-obvious fields

**JSDoc/TSDoc:**
- Use for exported functions and interfaces
- Include `@param` and `@returns` for complex functions
- Use `@example` for formatters and utilities

**Pattern (from `src/lib/costs/formatters.ts`):**
```typescript
/**
 * Format amount as CHF currency
 * Uses Swiss locale (de-CH) for proper formatting
 *
 * @example formatCHF(1234.56) => "CHF 1'234.56"
 * @example formatCHF(null) => "-"
 */
export function formatCHF(amount: number | null | undefined): string {
```

**API Route Documentation:**
```typescript
/**
 * GET /api/tasks
 *
 * Returns all tasks with project and unit info.
 * Supports query params: ?status=open|completed, ?project_id=uuid
 * For Imeri role: filters to visible_to_imeri=true projects only
 */
```

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Extract helper functions for reusable logic
- API handlers: one exported function per HTTP method

**Parameters:**
- Use object destructuring for props in React components
- Use interfaces for complex parameter objects
- Optional parameters with `?` or defaults

**Return Values:**
- API routes: `Promise<NextResponse<SuccessType | ErrorResponse>>`
- Async functions: always return Promise
- Use union types for success/error returns
- Avoid `any`, prefer `unknown` for untyped data

## Module Design

**Exports:**
- Named exports for utilities and components
- Default export only for page components (`export default function PageName()`)
- Re-export related types from type modules

**Barrel Files:**
- Used sparingly: `src/types/index.ts` re-exports common types
- `src/components/costs/index.ts` for cost component exports
- Avoid deep barrel file nesting

## React Component Patterns

**Functional Components:**
- All components are functional (no class components)
- Use `forwardRef` for form elements (`Button`, `Input`, `Card`)
- Set `displayName` on forwardRef components

**Pattern (from `src/components/ui/button.tsx`):**
```typescript
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', ...props }, ref) => {
    return <button ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
```

**State Management:**
- Use `useState` for local component state
- Use `useCallback` for memoized callbacks
- Use `useEffect` for side effects with proper dependencies
- Custom hooks in `src/hooks/` for reusable stateful logic

**Component File Structure:**
1. 'use client' directive (if client component)
2. Imports
3. Types/interfaces for this component
4. Helper functions (private to module)
5. Main component export

## UI/Styling Patterns

**Tailwind CSS:**
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Touch-optimized: minimum 48px height for interactive elements
- Dark mode: use `dark:` variants consistently
- Responsive: mobile-first with `sm:`, `md:` breakpoints

**CSS Variables:**
- Brand colors: `var(--brand-primary)`, `var(--brand-primary-hover)`
- Status colors: `var(--status-success)`, `var(--status-error)`

**Component Classes Pattern:**
```typescript
const variantClasses = {
  primary: 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700',
}
```

## API Design Conventions

**Route Structure:**
- RESTful: `/api/[resource]` for collections, `/api/[resource]/[id]` for items
- Nested resources: `/api/[parent]/[id]/[child]`

**Request/Response:**
- GET: query params for filtering (`?status=open&project_id=uuid`)
- POST: JSON body with typed input interface
- Response: typed JSON with wrapped data (`{ tasks: [...] }` not bare array)

**Authentication:**
- Headers set by middleware: `x-user-id`, `x-user-role`
- Validate at start of every handler
- Return 401 for missing auth, 403 for insufficient permissions

## Localization

**Language:** German (de-CH) for user-facing content

**Patterns:**
- UI text in German: "Keine Aufgaben vorhanden", "Speichern", "Abbrechen"
- Date format: Swiss format DD.MM.YYYY via `formatSwissDate()`
- Currency: CHF with Swiss number format via `formatCHF()`
- Umlauts written as ASCII: "ae" for "ä", "ue" for "ü", "oe" for "ö" (based on observed pattern)

---

*Convention analysis: 2026-01-19*
