---
phase: 08
plan: 01
name: Template Schema & Types
subsystem: template-system
tags: [database, types, wbs, templates]

# Dependencies
requires:
  - phase-07 (Foundation & Data Model)
provides:
  - template database schema (6 tables)
  - template TypeScript types
  - WBS hierarchy structure
affects:
  - 08-02 (Template API)
  - 08-03 (Template UI)
  - 08-04 (Template Application)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 3-level WBS hierarchy (Phase > Package > Task)
    - JSONB for flexible checklist/materials structures
    - Calculated fields via triggers

# Files
key-files:
  created:
    - supabase/migrations/032_templates.sql
    - supabase/migrations/033_template_triggers.sql
    - src/types/templates.ts
  modified:
    - src/types/index.ts
    - src/types/database.ts

# Decisions
decisions:
  - id: template-wbs-hierarchy
    choice: 3-level WBS (Phase > Package > Task)
    rationale: Standard project management structure, allows dependency modeling

  - id: template-scope-enum
    choice: unit vs room scope distinction
    rationale: Supports both complete renovation and room-specific templates

  - id: duration-calculation
    choice: Package duration = MAX(tasks), Phase duration = SUM(packages)
    rationale: Tasks can overlap within package, packages are sequential

  - id: soft-blocking-gates
    choice: is_blocking defaults to false
    rationale: Quality gates are advisory by default, can be made mandatory

# Metrics
metrics:
  duration: 3 minutes
  completed: 2026-01-18
---

# Phase 08 Plan 01: Template Schema & Types Summary

**One-liner:** WBS-based template database schema with 6 tables and full TypeScript types for renovation template library.

## Completed Tasks

| # | Task | Commit |
|---|------|--------|
| 1-9 | Database schema (enums, 6 tables, triggers) | 6784a7a |
| 10-12 | TypeScript types (enums, interfaces, exports) | 8dd41e0 |

## What Was Built

### Database Schema (032_templates.sql)

**4 Enum Types:**
- `template_category`: complete_renovation, room_specific, trade_specific
- `template_scope`: unit, room
- `dependency_type`: FS, SS, FF, SF (standard project management)
- `gate_level`: package, phase

**6 Tables:**
1. `templates` - Root template entity with category/scope
2. `template_phases` - WBS Level 1 (major phases)
3. `template_packages` - WBS Level 2 (work packages)
4. `template_tasks` - WBS Level 3 (individual tasks)
5. `template_dependencies` - Task-to-task relationships
6. `template_quality_gates` - Checkpoints at phase/package boundaries

**Key Features:**
- CASCADE delete from parent to child
- UNIQUE constraints on WBS codes within parent scope
- CHECK constraint ensuring quality gates link to exactly one entity
- JSONB fields for materials_list and checklist_template

### Calculation Triggers (033_template_triggers.sql)

- `calculate_package_totals()` - MAX duration, SUM cost from tasks
- `calculate_phase_totals()` - SUM duration from packages
- `calculate_template_totals()` - SUM duration/cost from phases

### TypeScript Types

**Enum Types (src/types/index.ts):**
- TemplateCategory, TemplateScope, DependencyType, GateLevel

**Interface Types (src/types/templates.ts):**
- Core entities: Template, TemplatePhase, TemplatePackage, TemplateTask
- Relationships: TemplateDependency, TemplateQualityGate
- JSONB structures: TemplateMaterialItem, TemplateChecklistItem
- Hierarchy types: TemplateWithHierarchy, TemplatePhaseWithPackages, etc.
- API input/response types for all CRUD operations

## Requirements Coverage

| Requirement | Status | How Addressed |
|-------------|--------|---------------|
| TMPL-01 | Complete | templates.category supports complete_renovation |
| TMPL-02 | Complete | templates.scope + target_room_type for room-specific |
| TMPL-03 | Complete | Full WBS hierarchy: Phase > Package > Task |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] Migration 032_templates.sql creates all 6 tables
- [x] Migration 033_template_triggers.sql creates all calculation triggers
- [x] All foreign key constraints with CASCADE delete
- [x] Unique constraints on WBS codes within parent scope
- [x] Check constraint on quality_gates entity reference
- [x] TypeScript compiles without errors (template types)
- [x] Template types exported from both index.ts and database.ts

## Next Phase Readiness

**Ready for 08-02 (Template API):**
- Database schema complete
- TypeScript types ready for API layer
- All CRUD input/response types defined

**Blockers:** None

**Considerations:**
- Migration must be applied to Supabase before API development
- Pre-existing Next.js route type errors in `.next/` are unrelated (noted in STATE.md)
