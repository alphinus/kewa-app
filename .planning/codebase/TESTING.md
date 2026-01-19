# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- **Not configured** - No test framework detected in `package.json`
- No Jest, Vitest, or other test runner dependencies found
- No test configuration files present

**Recommendation:**
For a Next.js 16 + React 19 project, consider:
- Vitest (fast, modern, ESM-native)
- React Testing Library for component tests
- Playwright or Cypress for E2E tests

**Current Scripts:**
```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint only
npm run type-check # TypeScript type checking (tsc --noEmit)
```

## Test File Organization

**Location:**
- No test files exist in the codebase
- Standard patterns for this stack would be:
  - Co-located: `src/components/ui/Button.test.tsx`
  - Separate: `__tests__/components/ui/Button.test.tsx`

**Recommended Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.ts` (Playwright) or `*.cy.ts` (Cypress)

## Test Structure

**Recommended Pattern for this codebase:**

**Component Tests:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**API Route Tests:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/tasks/route'
import { NextRequest } from 'next/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
}))

describe('GET /api/tasks', () => {
  it('returns 401 without auth headers', async () => {
    const request = new NextRequest('http://localhost/api/tasks')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns tasks for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/tasks', {
      headers: {
        'x-user-id': 'user-123',
        'x-user-role': 'kewa'
      }
    })
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('tasks')
  })
})
```

**Hook Tests:**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from '@/hooks/useSession'

describe('useSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('starts with loading state', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ authenticated: false })
    })

    const { result } = renderHook(() => useSession())
    expect(result.current.loading).toBe(true)
  })

  it('returns authenticated session', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authenticated: true,
        role: 'kewa',
        userId: 'user-123'
      })
    })

    const { result } = renderHook(() => useSession())

    await waitFor(() => {
      expect(result.current.session.authenticated).toBe(true)
      expect(result.current.session.user?.role).toBe('kewa')
    })
  })
})
```

## Mocking

**Framework:** Vitest `vi` (recommended)

**What to Mock:**
- Supabase client (`@/lib/supabase/server`)
- External API calls (`fetch`)
- Environment variables (`process.env`)
- Date/time for consistent tests

**What NOT to Mock:**
- Pure utility functions (`formatCHF`, `cn`)
- Type definitions
- Component rendering logic

**Mock Patterns:**

**Supabase Client:**
```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  }))
}))
```

**Fetch API:**
```typescript
beforeEach(() => {
  global.fetch = vi.fn()
})

it('handles API response', async () => {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ tasks: mockTasks })
  })
})
```

**Next.js Cookies:**
```typescript
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(() => [])
  }))
}))
```

## Fixtures and Factories

**Test Data Location:**
- Recommended: `src/__tests__/fixtures/` or `tests/fixtures/`

**Factory Pattern:**
```typescript
// tests/fixtures/tasks.ts
import type { Task, TaskWithProject } from '@/types/database'

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random().toString(36).substr(2, 9),
    project_id: 'proj-123',
    title: 'Test Task',
    description: null,
    status: 'open',
    priority: 'normal',
    due_date: null,
    completed_at: null,
    completion_note: null,
    recurring_type: 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

export function createTaskWithProject(overrides: Partial<TaskWithProject> = {}): TaskWithProject {
  return {
    ...createTask(),
    project: {
      id: 'proj-123',
      name: 'Test Project',
      unit_id: 'unit-456',
      visible_to_imeri: true
    },
    unit: {
      id: 'unit-456',
      name: 'Wohnung 1.01',
      unit_type: 'apartment',
      floor: 1
    },
    ...overrides
  }
}
```

## Coverage

**Requirements:** Not enforced (no coverage config)

**Recommended Setup:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', '.next/', '**/*.d.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60
      }
    }
  }
})
```

**View Coverage:**
```bash
npm run test:coverage  # (after setup)
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, hooks
- Examples: `formatCHF()`, `validateSession()`, `cn()`
- Approach: Direct function calls with assertions

**Integration Tests:**
- Scope: API routes with mocked Supabase
- Examples: `GET /api/tasks`, `POST /api/projects`
- Approach: Mock database layer, test full request/response

**Component Tests:**
- Scope: React components in isolation
- Examples: `Button`, `Card`, `TaskList`
- Approach: React Testing Library, test rendering and interactions

**E2E Tests:**
- Scope: Full user flows (login, create task, etc.)
- Tool: Playwright recommended for Next.js
- Approach: Real browser, test database or fixtures

## Common Patterns

**Async Testing:**
```typescript
it('fetches data on mount', async () => {
  render(<TaskList />)

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText('Laden...')).not.toBeInTheDocument()
  })

  expect(screen.getByText('Task Title')).toBeInTheDocument()
})
```

**Error Testing:**
```typescript
it('handles API errors gracefully', async () => {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

  render(<Dashboard />)

  await waitFor(() => {
    expect(screen.getByText(/fehler/i)).toBeInTheDocument()
  })
})
```

**Form Submission Testing:**
```typescript
it('submits form with valid data', async () => {
  const onSave = vi.fn()
  render(<WorkOrderForm mode="create" onSave={onSave} onCancel={vi.fn()} />)

  await userEvent.type(screen.getByLabelText(/titel/i), 'New Work Order')
  await userEvent.click(screen.getByRole('button', { name: /erstellen/i }))

  await waitFor(() => {
    expect(onSave).toHaveBeenCalled()
  })
})
```

**Testing German UI:**
```typescript
// Match German text (use exact or regex)
expect(screen.getByText('Keine Aufgaben vorhanden')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /speichern/i })).toBeEnabled()
```

## Recommended Test Setup

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
```

**Setup File (`tests/setup.ts`):**
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
vi.stubEnv('SESSION_SECRET', 'test-secret-for-testing')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Priority Test Areas

Based on codebase analysis, prioritize testing:

1. **Authentication (`src/lib/session.ts`, `src/lib/auth.ts`)**
   - `validateSession()` - critical security function
   - `createSession()` - token generation
   - `verifyPin()`, `verifyPassword()` - credential verification

2. **API Routes (`src/app/api/`)**
   - Auth endpoints: `/api/auth/login`, `/api/auth/session`
   - Core CRUD: `/api/tasks`, `/api/projects`
   - Permission checks in all routes

3. **Formatters (`src/lib/costs/formatters.ts`)**
   - `formatCHF()` - currency display
   - `formatSwissDate()` - date display
   - Easy to test, high visibility

4. **UI Components (`src/components/ui/`)**
   - `Button` - variants, disabled, loading states
   - `Input` - validation, error display
   - `Card` - rendering, composition

---

*Testing analysis: 2026-01-19*
