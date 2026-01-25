# Phase 15 Context: Einheiten-Verwaltung

## Phase Goal

Admin can manage units (Wohnungen) and rooms within buildings for condition tracking.

## Decisions

### Unit Identity & Display

| Decision | Detail |
|----------|--------|
| Unit numbering | Floor.Apartment format (e.g., 4.1, 4.2) |
| Size classification | Fixed dropdown: 1-Zi., 1.5-Zi., 2-Zi., 2.5-Zi., 3-Zi., 3.5-Zi., 4-Zi., 4.5-Zi., 5-Zi., 5.5-Zi., 6-Zi. |
| Floor handling | Numeric with labels (EG=0, UG=negative, OG=positive) |
| Unit list display | Unit number, tenant name (or "Leerstand"), room count, condition from Digital Twin |
| Unit detail view | Three sections: Tenant info, Condition overview, Room listing |

### Vacancy Logic (Leerstand)

| Condition | Status |
|-----------|--------|
| No tenant assigned | Leerstand (automatic) |
| Komplettsanierung project active | Leerstand (automatic) |
| Major work in progress | Leerstand (manual toggle) |
| Tenant assigned + small projects | Bewohnt |

### Tenant Data Model

**Current Tenant Fields:**
- Name (required)
- Phone (required)
- Email (optional)
- Move-in date (required)

**Tenant History Fields:**
- Name
- Move-in date
- Move-out date
- Reason for leaving: Kündigung, Interner Wechsel, other
- Link to new unit (if internal move)

**Internal Move Handling:**
- Same tenant record, linked to unit history (one tenant = one ID)
- Requires reason and date
- Creates transfer record
- Updates both units (old: history entry, new: current tenant)

**Neuvermietung (Vacancy Marketing):**
- Status: "Neuvermietung geplant"
- Expected move-in date
- Expected rent
- Target tenant type
- Notes field

**Übergabeprotokoll:**
- Admin sets move-out date
- Protocol prepared and linked to tenant history

### Room Types & Structure

**Unit-Level Room Types (Dropdown):**
- Wohnzimmer
- Zimmer 1, Zimmer 2, Zimmer 3, Zimmer 4
- Küche
- Bad/WC
- Korridor
- Balkon
- Abstellraum
- Keller
- Estrich
- Custom (user-defined)

**Building-Level Rooms (Gemeinschaftsräume):**
- Waschküche
- Veloraum
- Technikraum
- Custom (user-defined)

**Room Data:**
- Type (from dropdown or custom)
- Name/label (user can override)
- Condition score (1-5 scale)
- Area in m² (optional)
- Condition aggregation from past tasks/projects

### Navigation & Entry Points

| Entry Point | Behavior |
|-------------|----------|
| Building detail view | "Einheiten" tab shows unit list |
| Sidebar menu | "Einheiten" item respects current building context |
| Gemeinschaftsräume | Separate section below units in building view |
| Unit click | Opens detail view with rooms immediately visible |

### Task Assignment Room Picker

- Tree view structure: Building → Units → Rooms
- Expandable hierarchy
- Gemeinschaftsräume shown at building level in tree
- Respects current building context

### Contractor Visibility

Work orders display:
- Tenant name
- Tenant phone

## Constraints

- Phase 15 scope: CRUD for units and rooms only
- Tenant data is reference/informational (no workflow automation)
- Condition score aggregation uses existing Digital Twin task data
- Building context from Phase 14 must be respected

## Deferred Ideas

Captured for future phases — not in Phase 15 scope:

| Idea | Future Phase |
|------|--------------|
| Tenant ticket system | Tenant Communication phase |
| Notification system with admin confirmation | Workflow Automation phase |
| Auto-generated listing text from unit data | Inserateportal phase |
| Upload to external listing portal | Inserateportal phase |

## Open Questions

None — all decisions captured.

---
*Created: 2026-01-24*
*Phase: 15 of 17*
*Milestone: v2.1 Master Data Management*
