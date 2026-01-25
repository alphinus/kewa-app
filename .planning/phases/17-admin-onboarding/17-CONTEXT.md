# Phase 17 Context: Admin & Onboarding

## Phase Goal

Admin has overview dashboard, search functionality, and new deployments have guided setup.

## Implementation Decisions

### A. Admin Dashboard Layout

**Scope:** Counts + alerts + quick actions

**Counter Cards:**
- Properties, Partners, Projects, Templates
- Responsive layout: 4-in-row (desktop) → 2x2 (tablet) → stack (mobile)
- Cards are clickable → navigate to respective list page

**Alerts to Surface:**
- Projects overdue (past deadline)
- Projects stalled (no activity in 7+ days)
- Partners inactive (deactivated count)
- Properties empty (no buildings)

**Alert Display:**
- Badge on counter card (red/yellow with count)
- Separate alerts section below cards with details

**Quick Actions:**
- All four create buttons: New Property, New Partner, New Project, New Template
- Prominent placement below or alongside counters

**Role-Specific Content:**
| Content | admin | kewa |
|---------|-------|------|
| Basic counters | ✓ | ✓ |
| Alerts | ✓ | ✓ |
| Quick actions | ✓ | ✓ |
| All properties view | limited | ✓ |
| User management link | - | ✓ |
| Migration/system status | - | ✓ |

### B. Search Behavior

**Search UX:**
- Instant search with 300ms debounce (filters as you type)
- Combined with existing filters (search within filtered results)

**Partner List Searchable Fields:**
- Company name (Firma)
- Contact person name
- Email address
- Trade categories

**Template List Searchable Fields:**
- Template name
- Description

**Filter Integration:**
- Search respects active filters (e.g., searching while "Active only" is toggled)
- Clearing search doesn't reset other filters

### C. Setup Wizard Flow

**Trigger Conditions:**
- First login for each user (per-user flag)
- Always accessible via Settings menu
- Skip option if system already has data

**Required Steps (all mandatory):**
1. Create first Property (Liegenschaft)
2. Create first Building (Gebäude) within property
3. Create first Partner (Handwerker/Lieferant)

**Wizard Behavior:**
- Modal/fullscreen overlay
- Step indicator showing progress (1 of 3)
- Cannot skip steps — all required for minimum viable setup
- Back button to edit previous steps
- Finish redirects to dashboard

**Help System:**
- Tooltip hints via ? icons next to fields and UI elements
- Contextual per page (different hints for Dashboard vs Partner vs Template)
- Master toggle in settings: "Disable all hints"
- Entry point: ? icon in header (always visible)

### D. Demo Data Script

**Data Realism:**
- Swiss-realistic: Zürich/Bern addresses, Swiss company names, CHF amounts
- Example properties: "Limmatstrasse 42, 8005 Zürich"
- Example partners: "Müller Sanitär AG", "Brunner Elektro GmbH"

**Data Volume (comprehensive):**
- 5+ properties with varying building counts
- 15+ buildings across properties
- 20+ partners (mix of contractors and suppliers)
- 10+ projects (mix of active, completed, overdue)
- Enough records to trigger pagination on all list views

**Project History:**
- Include completed projects with full timeline
- Status progression data for Digital Twin history
- Mix of on-time and delayed completions

**Script Behavior:**
- Idempotent: checks for existing demo data, skips if present
- Marker: demo records tagged (e.g., `is_demo: true` or naming convention)
- Safe to run multiple times without duplicating data

### E. Deployment Documentation

**README Scope:**
- Supabase project setup (tables, RLS policies, functions)
- Vercel deployment configuration
- Environment variables list with descriptions
- First-run checklist

## Deferred Ideas

None captured during discussion.

## Requirements Mapping

| Requirement | Covered By |
|-------------|------------|
| ADMN-01: Dashboard counters | Plan 17-02 |
| ADMN-02: Quick actions | Plan 17-02 |
| ADMN-03: Search/filter | Plan 17-03 |
| SEED-01: Migrations documented | Plan 17-01 |
| SEED-02: Demo data script | Plan 17-04 |
| SEED-03: Setup wizard | Plan 17-05 |
| SEED-04: Deployment docs | Plan 17-06 |

## Open Questions

None — all gray areas resolved.

---
*Context captured: 2026-01-25*
*Ready for: Research → Planning*
