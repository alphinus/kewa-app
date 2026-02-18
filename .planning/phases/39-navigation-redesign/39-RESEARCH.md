# Phase 39: Navigation Redesign - Research

**Researched:** 2026-02-18
**Domain:** Next.js App Router navigation, route restructuring, mobile bottom sheet, breadcrumbs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D1: Mobile Footer — 5 Items**
Footer reduces from 8 items to 5:
| Position | Label | Icon | Route |
|----------|-------|------|-------|
| 1 | Übersicht | LayoutDashboard | /dashboard |
| 2 | Objekte | Landmark | /dashboard/objekte |
| 3 | Aufgaben | CheckSquare | /dashboard/aufgaben |
| 4 | Kosten | Banknote | /dashboard/kosten |
| 5 | Mehr | Menu | Bottom sheet |

- Kosten tab covers: Ausgaben, Rechnungen, Wohnungen-Kosten, Export, AND Projekte
- Objekte replaces Liegenschaft + Gebäude as the entry point for the property hierarchy drill-down

**D2: "Mehr" Menu — Bottom Sheet**
Opens as a bottom sheet sliding up from the footer. Tap outside or swipe down to dismiss.
Items in Mehr: Projekte, Lieferanten, Berichte, Abnahmen, Änderungsaufträge, Vorlagen, Knowledge Base, Audio, Benachrichtigungen, Einstellungen

**D3: Breadcrumbs — Contextual, Not Duplicating Header**
Header retains OrgSwitcher + CombinedSelector from Phase 38. Breadcrumbs show location in page hierarchy.
- On /objekte drill-down: `Objekte > Wohnanlage Seefeld > Gebäude 1 > Wohnung 101`
- On non-object pages: `Übersicht > Aufgaben`
- No breadcrumbs on /dashboard home

**D4: Property List — Cards Grouped by Mandate**
`/dashboard/objekte` shows property cards grouped under mandate section headers.
Single-mandate orgs: no mandate header shown.

**D5: Building Detail — Tabs Layout**
`/dashboard/objekte/[propertyId]/[buildingId]` uses tabs: Heatmap | Einheiten | Info
Existing page content reused, wrapped in tabs layout.

**D6: Unit Detail — Overview + Room Drill-Down**
`/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` shows header section, room cards, room drill-down.

**D7: URL Redirects — All Four Object Routes**
308 permanent redirects:
| Old Route | New Route |
|-----------|-----------|
| `/dashboard/liegenschaft` | `/dashboard/objekte` |
| `/dashboard/liegenschaft/[id]` | `/dashboard/objekte/[propertyId]` |
| `/dashboard/gebaude` | `/dashboard/objekte` |
| `/dashboard/einheiten/[id]` | `/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` |
| `/dashboard/wohnungen/[id]` | `/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` |

**D8: Internal Links — Full Update**
All `/liegenschaft`, `/gebaude`, `/einheiten`, `/wohnungen` hrefs in the codebase updated to `/objekte` paths. No reliance on redirects for internal navigation.

### Deferred Ideas (OUT OF SCOPE)
- Floor plan management and Plandokumente viewer
- Drag&drop building/unit layout editor
- Umbaumassnahmen tracking
- Building detail page visual modernization
- Full Objekte search/filter capabilities
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Breadcrumb component using usePathname(). Display hierarchy: Org > Mandat > Liegenschaft > Gebaeude > Einheit. Map URL segments to German labels. | Existing `Breadcrumbs` component in `src/components/ui/breadcrumbs.tsx` can be extended. Needs labels for `objekte`, UUIDs mapped to entity names via fetch or URL context. |
| NAV-02 | Simplified mobile footer: 5 items, Mehr opens overflow. All previously top-level items reachable within 2 taps. | `mobile-nav.tsx` already implements the footer pattern. New bottom sheet needed. Existing custom Dialog + CSS animation patterns apply. |
| NAV-03 | Objekte drill-down routes: `/dashboard/objekte` > `/[propertyId]` > `/[buildingId]` > `/[unitId]`. Replaces liegenschaft/ and gebaude/. | APIs already exist: `GET /api/properties`, `GET /api/buildings?property_id=`, `GET /api/units?building_id=`. New page files needed at new paths. Existing page content is reused. |
| NAV-04 | Redirect old URLs to new /objekte/* structure. No 404s for previously valid routes. | `next.config.ts` `redirects()` array is the correct mechanism. D7's static routes map cleanly to `next.config.ts` entries. ID-dependent routes (einheiten/[id], wohnungen/[id]) cannot be resolved without a lookup — need a redirect page that fetches and then navigates. |
</phase_requirements>

---

## Summary

This phase is a structural reorganisation: collapse three separate navigation entry points (Liegenschaft, Gebäude, Einheiten) into a single URL hierarchy under `/dashboard/objekte`, reduce the footer from 8 items to 5, add a "Mehr" bottom sheet for overflow items, and wire breadcrumbs that reflect the actual page position.

All required APIs already exist (`/api/properties`, `/api/buildings`, `/api/units`, `/api/buildings/[id]/heatmap`). The data model is already correct — Property → Building → Unit → Room is fully supported. The work is almost entirely UI and routing: new page files, updated navigation components, and redirect configuration.

The biggest implementation challenge is the ID-mapping redirect for `/dashboard/einheiten/[id]` and `/dashboard/wohnungen/[id]`. These IDs are unit UUIDs. The new path requires `/objekte/[propertyId]/[buildingId]/[unitId]` — so property and building IDs must be resolved from the unit ID. A thin catch-all redirect page that calls `GET /api/units/[id]` and then `router.replace()` to the new URL is the correct approach.

**Primary recommendation:** Use `next.config.ts` `redirects()` for all static-segment old routes, and a client redirect page for the ID-parameterised old routes. Build the `/objekte/*` page hierarchy from scratch using existing page content, and extend the existing `Breadcrumbs` component for the new URL structure.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App Router pages, redirects, navigation | Already in use |
| react | 19.2.3 | Component model | Already in use |
| lucide-react | ^0.562.0 | Icons (Landmark, Banknote, Menu, LayoutDashboard, CheckSquare) | Already in use |
| tailwindcss | ^4 | Styling, animations, safe-area utilities | Already in use |
| next/navigation | built-in | `usePathname()`, `useRouter()`, `permanentRedirect()` | Already in use across codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| js-cookie | ^3.0.5 | Reading org/mandate cookies for breadcrumb context | Already in use in contexts |
| Supabase | ^2.90.1 | API calls on new Objekte pages | Already wired through existing API routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom bottom sheet | Radix UI Dialog/Sheet | Radix is NOT installed as a package dependency (only @radix-ui/react-select is present). Custom implementation matches existing pattern from `reject-modal.tsx` which does exactly a bottom-sliding sheet. |
| next.config.ts redirects | page.tsx with permanentRedirect() | Both work. next.config.ts runs before page rendering (faster, no React overhead). Better for static routes. Client redirect pages needed for dynamic ID-mapping. |
| Client-side tab state | URL-based tab routing | URL-based tabs (query param `?tab=heatmap`) allow deep-linking and back-nav. Simpler than parallel routes. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/dashboard/
├── objekte/
│   ├── page.tsx                              # D4: Property list grouped by mandate
│   ├── [propertyId]/
│   │   ├── page.tsx                          # Property detail: building list
│   │   └── [buildingId]/
│   │       ├── page.tsx                      # D5: Building detail with tabs
│   │       └── [unitId]/
│   │           ├── page.tsx                  # D6: Unit detail + room cards
│   │           └── raum/
│   │               └── [roomId]/
│   │                   └── page.tsx          # Room detail (moved from liegenschaft path)
│
├── liegenschaft/
│   ├── page.tsx                              # → redirect stub → /dashboard/objekte
│   └── [id]/
│       ├── page.tsx                          # → redirect stub → /dashboard/objekte/[propertyId]
│       └── einheit/
│           └── [unitId]/
│               └── raum/
│                   └── [roomId]/
│                       └── page.tsx          # → redirect stub → /objekte path
│
├── gebaude/
│   └── page.tsx                              # → redirect stub or next.config.ts entry
│
├── einheiten/
│   ├── page.tsx                              # → redirect to /dashboard/objekte
│   └── [id]/
│       └── page.tsx                          # → client redirect: fetch unit → resolve path
│
└── wohnungen/
    └── [id]/
        └── page.tsx                          # → client redirect: fetch unit → resolve path

src/components/navigation/
├── mobile-nav.tsx                            # Edit: 8→5 items + Mehr button
├── MehrBottomSheet.tsx                       # New: bottom sheet component
├── header.tsx                                # Unchanged
├── Breadcrumbs.tsx                           # Edit or new: nav-aware breadcrumbs
└── ... (existing Phase 38 components)

src/components/ui/
└── breadcrumbs.tsx                           # Existing — extend or replace
```

### Pattern 1: next.config.ts Redirects for Static Routes

**What:** Add `redirects()` array to `next.config.ts` for routes where no ID transformation is needed.
**When to use:** When the old and new routes share identical dynamic segments or the old route has no IDs.

```typescript
// Source: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/redirecting.mdx
// In next.config.ts — within nextConfig object

async redirects() {
  return [
    {
      source: '/dashboard/liegenschaft',
      destination: '/dashboard/objekte',
      permanent: true,  // 308
    },
    {
      source: '/dashboard/gebaude',
      destination: '/dashboard/objekte',
      permanent: true,
    },
    {
      source: '/dashboard/einheiten',
      destination: '/dashboard/objekte',
      permanent: true,
    },
    // Note: /liegenschaft/[id] → /objekte/[propertyId] is NOT a simple rename
    // because [id] was a building ID in the old route but [propertyId] is a property ID.
    // This requires a client redirect page (see Pattern 2).
  ]
},
```

**Key facts (verified, Context7 / official docs):**
- `permanent: true` issues HTTP 308 — browsers and search engines treat it as permanent and cache it.
- Processed before any middleware or page rendering — zero React overhead.
- Supports `:param` capture: `source: '/dashboard/liegenschaft/:id'`, `destination: '/dashboard/objekte/:id'` — but only when ID semantics match (same UUID, same entity).

### Pattern 2: Client Redirect Page for ID-Mapping Routes

**What:** A thin client component that reads the old ID, calls the API to resolve the new path, then calls `router.replace()`.
**When to use:** When old ID → new path requires a database lookup (e.g., unit ID → property/building/unit path).

```tsx
// src/app/dashboard/einheiten/[id]/page.tsx
'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EinheitenRedirectPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    async function resolveAndRedirect() {
      try {
        const res = await fetch(`/api/units/${id}`)
        if (!res.ok) {
          router.replace('/dashboard/objekte')
          return
        }
        const data = await res.json()
        const unit = data.unit
        // unit has building_id; need to fetch building to get property_id
        const buildingRes = await fetch(`/api/buildings/${unit.building_id}`)
        if (!buildingRes.ok) {
          router.replace('/dashboard/objekte')
          return
        }
        const buildingData = await buildingRes.json()
        const propertyId = buildingData.building.property_id
        router.replace(
          `/dashboard/objekte/${propertyId}/${unit.building_id}/${id}`
        )
      } catch {
        router.replace('/dashboard/objekte')
      }
    }
    resolveAndRedirect()
  }, [id, router])

  return (
    <div className="p-8 text-center text-gray-500">
      Weiterleitung...
    </div>
  )
}
```

**Note on `/dashboard/liegenschaft/[id]`:** In the old system, the `[id]` param in `liegenschaft/[id]` was actually a **building ID** (the page calls `GET /api/buildings/${id}`). In the new system the first segment after `/objekte/` is a **property ID**. So this route also requires a client redirect: fetch the building, get `property_id`, redirect to `/objekte/[property_id]/[buildingId]`.

### Pattern 3: Breadcrumbs with Segment Label Map

**What:** Extend or replace the existing `src/components/ui/breadcrumbs.tsx`. The component uses `usePathname()` and maps URL segments to German display labels.
**When to use:** On all dashboard pages except `/dashboard` itself (no breadcrumbs on home per D3).

```tsx
'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Static label map for known route segments
const SEGMENT_LABELS: Record<string, string> = {
  'objekte':         'Objekte',
  'aufgaben':        'Aufgaben',
  'kosten':          'Kosten',
  'projekte':        'Projekte',
  'lieferanten':     'Lieferanten',
  'berichte':        'Berichte',
  'settings':        'Einstellungen',
  'einheiten':       'Einheiten',
  'raum':            'Raum',
  'abnahmen':        'Abnahmen',
  'knowledge':       'Wissen',
  'audio':           'Audio',
  'benachrichtigungen': 'Benachrichtigungen',
  'aenderungsauftraege': 'Änderungsaufträge',
  'vorlagen':        'Vorlagen',
}

interface BreadcrumbsProps {
  // Entity name overrides for UUID segments: { 'abc-123': 'Wohnanlage Seefeld' }
  labels?: Record<string, string>
}

export function DashboardBreadcrumbs({ labels }: BreadcrumbsProps) {
  const pathname = usePathname()

  const items = useMemo(() => {
    // No breadcrumbs on /dashboard home
    if (pathname === '/dashboard') return []

    const segments = pathname
      .split('/')
      .filter(Boolean)
      .filter(s => s !== 'dashboard')

    return segments.map((seg, idx) => {
      const pathParts = ['/dashboard', ...segments.slice(0, idx + 1)]
      const href = pathParts.join('/')
      const label = labels?.[seg]
        ?? SEGMENT_LABELS[seg]
        ?? seg  // fallback: UUID shown as-is (pages should override via labels prop)

      return { label, href }
    })
  }, [pathname, labels])

  if (items.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4"
         aria-label="Breadcrumb">
      {/* "Übersicht" home link always first */}
      <Link href="/dashboard"
            className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        Übersicht
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={item.href} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {item.label}
              </span>
            ) : (
              <Link href={item.href}
                    className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
```

**UUID segments on Objekte pages:** Each drill-down page knows its entity's name from the fetched data. Pass `labels={{ [propertyId]: propertyName, [buildingId]: buildingName, [unitId]: unitName }}` to give readable names.

### Pattern 4: Mehr Bottom Sheet

**What:** A custom bottom sheet that slides up from the footer, matching the existing `reject-modal.tsx` pattern already in the codebase.
**When to use:** On tap of "Mehr" in the mobile footer.

The project has NO Radix Sheet or Drawer installed. The existing `reject-modal.tsx` in `src/app/contractor/[token]/[workOrderId]/reject-modal.tsx` already demonstrates the exact pattern:
- `fixed inset-0 bg-black/50` backdrop
- `bg-white ... rounded-t-2xl` content sliding from bottom
- tap-outside to close via `onClick` on backdrop

The codebase also has CSS keyframe animations in `globals.css` (`slideInFromRight`). A `slideInFromBottom` variant should be added there.

```tsx
// src/components/navigation/MehrBottomSheet.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  Archive, Truck, FileText, CheckSquare2, FolderOpen,
  FileTemplate, BookOpen, Mic, Bell, Settings
} from 'lucide-react'

interface MehrBottomSheetProps {
  open: boolean
  onClose: () => void
}

const MEHR_ITEMS = [
  { href: '/dashboard/projekte',            label: 'Projekte',          icon: Archive },
  { href: '/dashboard/lieferanten',         label: 'Lieferanten',       icon: Truck },
  { href: '/dashboard/berichte',            label: 'Berichte',          icon: FileText },
  { href: '/dashboard/abnahmen',            label: 'Abnahmen',          icon: CheckSquare2 },
  { href: '/dashboard/aenderungsauftraege', label: 'Änderungsaufträge', icon: FolderOpen },
  { href: '/dashboard/vorlagen/abnahmen',   label: 'Vorlagen',          icon: FileTemplate },
  { href: '/dashboard/knowledge',           label: 'Knowledge Base',    icon: BookOpen },
  { href: '/dashboard/audio',              label: 'Audio',             icon: Mic },
  { href: '/dashboard/benachrichtigungen',  label: 'Benachrichtigungen',icon: Bell },
  { href: '/dashboard/settings',           label: 'Einstellungen',     icon: Settings },
]

export function MehrBottomSheet({ open, onClose }: MehrBottomSheetProps) {
  // Lock scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl safe-area-bottom animate-slide-in-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-4 gap-2 p-4 pb-6">
          {MEHR_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-700 dark:text-gray-300 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

Add to `globals.css`:
```css
@keyframes slideInFromBottom {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.animate-slide-in-bottom {
  animation: slideInFromBottom 0.25s ease-out forwards;
}
```

### Pattern 5: Property List Page (`/dashboard/objekte`)

**What:** Fetches from `GET /api/properties` (which returns `PropertyWithBuildings[]` with `mandate_id`). Groups cards by mandate. Single-mandate: no header (same D3 logic as CombinedSelector).

The existing `CombinedSelector.tsx` already has this grouping logic — reference it. The API already returns mandate-grouped data.

```tsx
// Data fetch — reuse GET /api/properties
const res = await fetch('/api/properties')
const { properties } = await res.json()
// properties: Array<Property & { buildings: Building[] }>
// Property has mandate_id

// Group by mandate using availableMandates from MandateContext
```

### Pattern 6: Building Detail Tabs (`/dashboard/objekte/[propertyId]/[buildingId]`)

**What:** Tab bar with `?tab=heatmap|einheiten|info` query param. No URL change on tab switch — use state. Or use query param for deep-linking.

Recommended: simple state-based tabs (no URL query param) to keep it minimal. The existing `useSearchParams()` from `next/navigation` supports query params if deep-linking becomes needed later.

```tsx
// Tab bar renders three buttons with isActive highlight
// Content area conditionally renders each tab's content
const [activeTab, setActiveTab] = useState<'heatmap' | 'einheiten' | 'info'>('heatmap')
```

Existing content to reuse:
- **Heatmap tab**: logic from `src/app/dashboard/liegenschaft/page.tsx` (the heatmap JSX + data fetch)
- **Einheiten tab**: logic from `src/app/dashboard/einheiten/page.tsx` (unit list, building-scoped)
- **Info tab**: from `src/app/dashboard/liegenschaft/[id]/page.tsx` (building metadata)

### Anti-Patterns to Avoid

- **Using permanentRedirect() inside a page.tsx for static routes:** Adds React rendering overhead unnecessarily. Use `next.config.ts` redirects array for static routes instead.
- **Attempting `next.config.ts` redirect for ID-mapping routes:** `next.config.ts` redirects can pass `:param` but cannot do API lookups. Use client redirect pages for those.
- **Breaking the existing CombinedSelector building context:** The `BuildingContext` and `CombinedSelector` must remain functional. The new `/objekte` pages do NOT use `BuildingContext` for navigation — they use URL params instead. The CombinedSelector in the header is a separate concern (global context for heatmap-style views).
- **Nesting the bottom sheet inside the nav component:** Keep `MehrBottomSheet` as a sibling rendered at the layout level to avoid z-index and portal conflicts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static URL redirects | Custom middleware redirect logic | `next.config.ts` redirects() | Runs before page render, browser-cached 308, zero React cost |
| Breadcrumb segment parsing | Full custom parser | Extend existing `src/components/ui/breadcrumbs.tsx` | Already built, just needs updated segment label map |
| Bottom sheet animation | Complex JS animation library | CSS keyframe + existing globals.css pattern | Already has `slideInFromRight`, just add `slideInFromBottom` |
| Property list grouping by mandate | Custom grouping logic | Re-use pattern from `CombinedSelector.tsx` + existing `/api/properties` response | API already returns mandate_id per property |

**Key insight:** 90% of the work is wiring together data that already exists. No new API routes needed. No new libraries. The shape of the problem is "move pages + update navigation UI".

---

## Common Pitfalls

### Pitfall 1: `/dashboard/liegenschaft/[id]` — Building ID vs. Property ID Mismatch

**What goes wrong:** Old `liegenschaft/[id]` route used a **building ID** as `[id]` (it calls `GET /api/buildings/${id}`). New `objekte/[propertyId]/[buildingId]` uses a **property ID** as the first segment. A naive `next.config.ts` redirect `source: '/dashboard/liegenschaft/:id', destination: '/dashboard/objekte/:id'` produces a broken URL because `:id` is a building UUID but the destination expects a property UUID.

**Why it happens:** The old data model treated "Liegenschaft" as a building. The new model separates Property from Building. The building in the old page had `building.property_id` on it.

**How to avoid:** Use a client redirect page for `liegenschaft/[id]`: fetch the building by old ID, extract `property_id`, redirect to `/objekte/[property_id]/[buildingId]`.

**Warning signs:** If users land on `/objekte/[some-building-uuid]` and get 404 — that's this bug.

### Pitfall 2: Room Detail URL Migration

**What goes wrong:** The existing room detail page lives at `src/app/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx`. Internal links (e.g., from inspection completion) point to this old path. The room detail page itself has breadcrumbs hardcoded to `liegenschaft`.

**Why it happens:** It's a deeply nested route with multiple parameters; easy to miss when doing the `grep + replace` pass for internal links.

**How to avoid:** Create the new room detail at `objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx`. Move content from old file. Update breadcrumbs. Then add a next.config.ts redirect from the old full path (this CAN use param capture since all IDs stay in place — but the building ID vs property ID issue applies to `[id]` segment here too, making it complex). Simplest: redirect the old liegenschaft/[id]/einheit/... path to `/dashboard/objekte` and let users re-navigate.

**Warning signs:** Inspection completion links, breadcrumb hrefs in the room page that still point to `/liegenschaft`.

### Pitfall 3: CombinedSelector Building Context vs. URL-Based Navigation

**What goes wrong:** `BuildingContext` sets a global `selectedBuildingId` cookie used by the old `liegenschaft` and `einheiten` pages. The new `/objekte` pages navigate via URL params (`[buildingId]`), not via `BuildingContext`. If the new pages accidentally read from `useBuilding()`, they'll get stale cookie data instead of the URL param.

**Why it happens:** Old pages were context-driven ("select a building in the header, then navigate to liegenschaft to see it"). New pages are URL-driven ("navigate to /objekte/[property]/[building]").

**How to avoid:** New `/objekte/[propertyId]/[buildingId]` pages use `params.buildingId` from the route, NOT `useBuilding()`. The `BuildingContext` remains for any existing pages that still use it (e.g., the legacy `/dashboard/liegenschaft` page before it's decommissioned, and potentially for backward compat with other pages that read `selectedBuildingId`).

**Warning signs:** Building detail page shows wrong building data, or shows "Alle" selected prompt when visiting via direct URL.

### Pitfall 4: Footer Active State for Nested Routes

**What goes wrong:** The `isActive` check in `mobile-nav.tsx` uses `pathname.startsWith(item.href + '/')`. With the new footer:
- "Objekte" (href `/dashboard/objekte`) must be active on ALL `/dashboard/objekte/...` paths.
- "Mehr" button has no `href` — it opens a sheet. Must show as active when the current pathname is in the Mehr items list.

**Why it happens:** The "Mehr" button is not a link, so `usePathname()` comparison must cover all Mehr routes.

**How to avoid:** For "Mehr" button active state, check if `pathname` starts with any Mehr item's href. If yes, show Mehr in active state.

### Pitfall 5: Breadcrumb UUID Segments Without Labels

**What goes wrong:** On `/dashboard/objekte/[propertyId]/[buildingId]`, the auto-generated breadcrumb segments for the UUIDs show as raw UUIDs (or truncated `abc12345...`) because no label override was provided.

**Why it happens:** The breadcrumb component generates labels from URL segments. UUIDs have no meaningful label in the URL.

**How to avoid:** Each Objekte page that fetches an entity by ID must pass its `labels` prop to `DashboardBreadcrumbs`: `labels={{ [propertyId]: property.name, [buildingId]: building.name }}`. The component already has a `labels?: Record<string, string>` prop (in the existing `breadcrumbs.tsx`).

### Pitfall 6: Missing `safe-area-bottom` on Bottom Sheet

**What goes wrong:** Bottom sheet content is hidden behind the iPhone home indicator on notched devices because the bottom sheet does not add safe area inset padding.

**Why it happens:** The footer has `safe-area-bottom` but any content rendered above it (the sheet) needs its own inset when positioned at the bottom of the screen.

**How to avoid:** Apply `safe-area-bottom` class to the bottom sheet container's bottom padding (same pattern as footer). The class is already defined in `globals.css`.

---

## Code Examples

### Existing Redirect Pattern (verified, contractor modal)

The existing `reject-modal.tsx` pattern confirms the custom bottom-sheet approach is already established in the codebase:

```tsx
// src/app/contractor/[token]/[workOrderId]/reject-modal.tsx (lines 52-61)
return (
  <div
    className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
    onClick={(e) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose()
      }
    }}
  >
    <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-4 pb-6
                    safe-area-inset-bottom max-h-[85vh] overflow-y-auto">
```

### Existing API: Buildings by Property

```typescript
// GET /api/buildings?property_id={id}
// Returns: { buildings: BuildingWithUnitCount[] }
// BuildingWithUnitCount = Building & { unit_count: number }
// Building has: id, name, address, property_id, created_at, updated_at

// GET /api/units?building_id={id}
// Returns: { units: Unit[] }

// GET /api/buildings/{id}/heatmap
// Returns: { buildingId, buildingName, units: HeatmapUnit[] }
```

### Next.js permanentRedirect (verified, Context7)

```typescript
// Source: vercel/next.js docs/01-app/02-guides/redirecting.mdx
// In next.config.ts — runs before rendering, issues true 308
async redirects() {
  return [
    {
      source: '/dashboard/liegenschaft',
      destination: '/dashboard/objekte',
      permanent: true,   // 308 status
    },
  ]
},
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `permanentRedirect()` in Server Component page.tsx | `next.config.ts` redirects() array | nextConfig runs before any page render — faster, cached by browser properly |
| Custom breadcrumb built per-page (hand-rolled `<nav>` in each page.tsx) | Shared `Breadcrumbs` component with labels prop | Already done in this codebase — just needs extension |
| Active nav detection with manual per-item logic | `pathname.startsWith(href)` pattern | Already implemented in `mobile-nav.tsx` — extend for Mehr items |

---

## Open Questions

1. **`/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]` path**
   - What we know: This is a deeply nested path with 3 IDs (building, unit, room). The new path needs property ID as first segment.
   - What's unclear: Does any external system (notifications, inspection links) deep-link to this exact room URL?
   - Recommendation: Move the page content to the new path. Add a `next.config.ts` redirect from the old path to `/dashboard/objekte` (not deep — just top level) since resolving 3 IDs in a redirect is complex. Internal links will be updated (D8) so old path is only needed for stale external links.

2. **Does `wohnungen/[id]` have different data than `einheiten/[id]`?**
   - What we know: `wohnungen/[id]` is a Server Component (uses `cookies()`, `createPublicClient`) while `einheiten/[id]` is a Client Component. Both show unit data but with different content sections.
   - What's unclear: Which becomes the canonical unit detail in the new `/objekte/.../[unitId]` route?
   - Recommendation: The new `/objekte/.../[unitId]` page should mirror the richer `wohnungen/[id]` content (condition summary, room grid, full timeline). The simpler `einheiten/[id]` content (tenant section, room form) can be collapsed into it or kept as a separate tab. D6 defines the spec: header + room cards + room drill-down — this matches `wohnungen/[id]` more closely.

3. **MehrBottomSheet z-index with existing modals**
   - What we know: Existing dialogs/modals use `z-50`. The bottom sheet should be `z-[60]` (above footer's `z-50`).
   - What's unclear: Are there any `z-[60+]` layers in existing modals that could conflict?
   - Recommendation: Set sheet to `z-[60]`, verify no existing component uses higher z-index (quick grep).

---

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js` (Context7) — `permanentRedirect`, `redirects()` in next.config.js, App Router page patterns
- Codebase direct reads — `mobile-nav.tsx`, `header.tsx`, `liegenschaft/page.tsx`, `einheiten/page.tsx`, `wohnungen/[id]/page.tsx`, `reject-modal.tsx`, `globals.css`, `breadcrumbs.tsx`, `CombinedSelector.tsx`, `OrganizationContext.tsx`, `MandateContext.tsx`, `BuildingContext.tsx`, `next.config.ts`, all API routes (`/api/properties`, `/api/buildings`, `/api/units`), `package.json`

### Secondary (MEDIUM confidence)
- Official Next.js redirecting guide (https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/redirecting.mdx) — confirms 308 status for `permanent: true`, param capture syntax

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — all APIs exist, patterns verified in codebase
- ID-mapping redirect: HIGH — data model confirmed: Building has `property_id`, Unit has `building_id`
- Bottom sheet: HIGH — identical pattern exists in codebase (`reject-modal.tsx`)
- Pitfalls: HIGH — building-ID-vs-property-ID mismatch confirmed by reading both old page and API types

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable framework, no fast-moving pieces)
