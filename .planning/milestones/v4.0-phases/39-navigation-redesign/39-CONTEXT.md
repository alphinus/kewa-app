# Phase 39 Context: Navigation Redesign

## Phase Goal

Navigation follows the data hierarchy with breadcrumbs and a simplified footer that keeps high-frequency features accessible.

## Requirements

NAV-01, NAV-02, NAV-03, NAV-04

## Decisions

### D1: Mobile Footer — 5 Items

Footer reduces from 8 items to 5:

| Position | Label | Icon | Route |
|----------|-------|------|-------|
| 1 | Übersicht | LayoutDashboard | /dashboard |
| 2 | Objekte | Landmark | /dashboard/objekte |
| 3 | Aufgaben | CheckSquare | /dashboard/aufgaben |
| 4 | Kosten | Banknote | /dashboard/kosten |
| 5 | Mehr | Menu | Bottom sheet |

- Kosten tab covers: Ausgaben, Rechnungen, Wohnungen-Kosten, Export, AND Projekte (cost-centric views)
- Objekte replaces Liegenschaft + Gebäude as the entry point for the property hierarchy drill-down

### D2: "Mehr" Menu — Bottom Sheet

Opens as a bottom sheet sliding up from the footer. Tap outside or swipe down to dismiss.

Items in Mehr:
- Projekte (full project management — also accessible via Kosten for budget views)
- Lieferanten (suppliers, orders, inventory, analytics)
- Berichte (weekly reports)
- Abnahmen (inspections)
- Änderungsaufträge (change orders)
- Vorlagen (templates)
- Knowledge Base
- Audio (voice notes)
- Benachrichtigungen
- Einstellungen

### D3: Breadcrumbs — Contextual, Not Duplicating Header

Header retains OrgSwitcher + CombinedSelector from Phase 38 (context switching). Breadcrumbs serve a different purpose: location within the page hierarchy.

**On /objekte drill-down pages:**
```
Objekte > Wohnanlage Seefeld > Gebäude 1 > Wohnung 101
```
Each segment is clickable and navigates to that drill-down level.

**On non-object pages:**
```
Übersicht > Aufgaben
```
Minimal breadcrumb — page name with link back to dashboard home.

No breadcrumbs on the dashboard home page itself.

### D4: Property List — Cards Grouped by Mandate

`/dashboard/objekte` shows properties as cards, grouped under mandate section headers.

```
MANDAT: Eigenverwaltung KEWA

┌────────────────────────────┐
│ Wohnanlage Seefeld          │
│ Seestrasse 42, Zürich       │
│ 2 Gebäude · 12 Einheiten    │
└────────────────────────────┘
┌────────────────────────────┐
│ Leweg 4                     │
│ Leweg 4, Zürich             │
│ 1 Gebäude · 10 Einheiten    │
└────────────────────────────┘
```

- Single-mandate orgs: no mandate header shown (same optimization as CombinedSelector D3 from Phase 38)
- Card click navigates to property detail (`/dashboard/objekte/[propertyId]`)
- Property detail shows list of buildings within that property

### D5: Building Detail — Tabs Layout

`/dashboard/objekte/[propertyId]/[buildingId]` uses a tabbed interface:

| Tab | Content |
|-----|---------|
| Heatmap | Existing 5-floor heatmap visualization (reused) |
| Einheiten | Unit list with condition indicators (reused) |
| Info | Building metadata (address, year built, etc.) |

Existing page content is reused — wrapped in tabs layout for structure. Visual modernization deferred to a future phase.

### D6: Unit Detail — Overview + Room Drill-Down

`/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` shows:

1. **Header section**: tenant info, area (m²), unit type, overall condition score
2. **Room cards**: each room as a card showing condition, last inspection date, thumbnail photo
3. Room card click navigates to `/dashboard/objekte/.../[unitId]/raum/[roomId]`

Reuses existing unit page content reorganized into this layout.

### D7: URL Redirects — All Four Object Routes

All legacy object routes receive permanent (308) redirects to `/objekte` equivalents:

| Old Route | New Route |
|-----------|-----------|
| `/dashboard/liegenschaft` | `/dashboard/objekte` |
| `/dashboard/liegenschaft/[id]` | `/dashboard/objekte/[propertyId]` |
| `/dashboard/gebaude` | `/dashboard/objekte` (buildings are under properties) |
| `/dashboard/einheiten/[id]` | `/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` |
| `/dashboard/wohnungen/[id]` | `/dashboard/objekte/[propertyId]/[buildingId]/[unitId]` |

Redirect files kept as thin stubs. ID mapping may require a lookup (old unit ID → property + building + unit path).

### D8: Internal Links — Full Update

All internal links and hrefs throughout the codebase are updated to use `/objekte` paths. No reliance on redirects for internal navigation. Grep for all occurrences of `/liegenschaft`, `/gebaude`, `/einheiten`, `/wohnungen` in link targets and update.

## Existing Architecture (Phase 38 State)

### Current Navigation

| Component | File | Current State |
|-----------|------|---------------|
| MobileNav | `src/components/navigation/mobile-nav.tsx` | 8 items: Übersicht, Liegenschaft, Gebäude, Aufgaben, Projekte, Lieferanten, Berichte, Einstellungen |
| Header | `src/components/navigation/header.tsx` | KEWA logo + OrgSwitcher + CombinedSelector + offline badge + sync + notifications + logout |
| No breadcrumbs | — | No breadcrumb component exists |
| No bottom sheet | — | No bottom sheet / "Mehr" component exists |

### Current Route Structure (to be consolidated)

```
/dashboard                          → stays (Übersicht)
/dashboard/liegenschaft             → REDIRECT to /objekte
/dashboard/liegenschaft/[id]        → REDIRECT to /objekte/[propertyId]
/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]  → MOVE to /objekte path
/dashboard/gebaude                  → REDIRECT to /objekte
/dashboard/einheiten                → REDIRECT to /objekte
/dashboard/einheiten/[id]           → REDIRECT to /objekte/.../[unitId]
/dashboard/wohnungen/[id]           → REDIRECT to /objekte/.../[unitId]
/dashboard/aufgaben                 → stays
/dashboard/kosten/*                 → stays
/dashboard/projekte/*               → stays (accessible via Kosten tab + Mehr)
/dashboard/lieferanten/*            → stays (accessible via Mehr)
/dashboard/berichte                 → stays (accessible via Mehr)
/dashboard/settings                 → stays (accessible via Mehr)
... all other routes stay           → accessible via Mehr
```

### New Route Structure

```
/dashboard/objekte                                          → Property list (grouped by mandate)
/dashboard/objekte/[propertyId]                             → Property detail (building list)
/dashboard/objekte/[propertyId]/[buildingId]                → Building detail (tabs: heatmap/units/info)
/dashboard/objekte/[propertyId]/[buildingId]/[unitId]       → Unit detail (overview + rooms)
/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId] → Room detail
```

## Constraints

- Phase 39 does NOT modernize building/unit page visuals (only restructures routes + adds breadcrumbs)
- Phase 39 does NOT add new building features (floor plans, drag&drop, construction tracking)
- Phase 39 does NOT change storage paths (Phase 40)
- Phase 39 does NOT change the header layout (OrgSwitcher + CombinedSelector stay from Phase 38)
- Existing page content is reused/moved — not rewritten
- All API routes stay unchanged — only page routes and navigation components change

## Deferred Ideas

- Floor plan management and Plandokumente viewer for buildings
- Drag&drop building/unit layout editor rethink
- Umbaumassnahmen tracking (construction measures affecting unit count/layout)
- Building detail page visual modernization (modern card design, interactive heatmap)
- Full Objekte search/filter capabilities

---
*Created: 2026-02-18 — Phase 39 discuss-phase complete*
