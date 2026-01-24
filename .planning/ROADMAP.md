# Roadmap: KEWA Renovation Operations System

## Milestones

- v1.0 MVP - Phases 1-6 (shipped 2025-03-XX)
- v2.0 Advanced Features - Phases 7-12.3 (shipped 2026-01-19)
- **v2.1 Master Data Management** - Phases 13-17 (in progress)

## Overview

v2.1 delivers complete master data management: Partner/Handwerker CRUD with WorkOrder integration, multi-property administration with context switching, unit and room management for the property hierarchy, template creation and editing UI, and an admin dashboard with onboarding flow. This milestone transforms KEWA from a single-property system to a scalable multi-tenant property management platform.

## Phases

**Phase Numbering:**
- Continues from v2.0 (Phase 12.3 was last)
- Integer phases (13, 14, 15): Planned milestone work
- Decimal phases (13.1, 13.2): Urgent insertions if needed

- [x] **Phase 13: Partner-Modul** - Partner/Handwerker CRUD with WorkOrder integration
- [x] **Phase 14: Multi-Liegenschaft** - Property/Building management with context switching
- [x] **Phase 15: Einheiten-Verwaltung** - Unit and room management within buildings
- [x] **Phase 16: Template-Management** - Template CRUD UI for project templates
- [ ] **Phase 17: Admin & Onboarding** - Dashboard, search, migrations, and setup wizard

## Phase Details

### Phase 13: Partner-Modul
**Goal**: Admin can fully manage partner/contractor master data and assign partners to work orders
**Depends on**: v2.0 shipped (Partner table exists, WorkOrder integration needed)
**Requirements**: PART-01, PART-02, PART-03, PART-04, PART-05
**Plans:** 4 plans

Plans:
- [ ] 13-01-PLAN.md — Partner API routes (GET/POST collection, GET/PATCH/DELETE single)
- [ ] 13-02-PLAN.md — Partner list UI with PartnerCard and filtering
- [ ] 13-03-PLAN.md — Partner create/edit form with validation
- [ ] 13-04-PLAN.md — WorkOrderForm partner dropdown integration

**Success Criteria** (what must be TRUE):
  1. Admin sees a list of all partners with company name, contact, and trade categories
  2. Admin can create a new partner with all required fields (Firma, Kontakt, Email, Gewerke)
  3. Admin can edit any partner's data and changes persist
  4. Admin can toggle partner active/inactive status and inactive partners are excluded from assignment
  5. WorkOrderForm shows dropdown of active partners and selected partner is saved to work order

### Phase 14: Multi-Liegenschaft
**Goal**: Admin can manage multiple properties with buildings and switch active context
**Depends on**: Phase 13 (partner management established)
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05
**Success Criteria** (what must be TRUE):
  1. Admin sees a list of all properties (Liegenschaften) with address and building count
  2. Admin can create a new property with address and metadata
  3. Admin can add buildings to a property and buildings appear in property detail view
  4. Header shows current active property with dropdown to switch context
  5. Dashboard and heatmap reflect the currently selected property (not hardcoded)
**Plans**: 5 plans

Plans:
- [x] 14-01-PLAN.md — Property/Building UPDATE and DELETE API routes
- [x] 14-02-PLAN.md — PropertySelector "Alle Liegenschaften" option and session behavior
- [x] 14-03-PLAN.md — Projects/Tasks API building_id filter support
- [x] 14-04-PLAN.md — Projects/Tasks pages building context wiring
- [x] 14-05-PLAN.md — Dashboard/Heatmap building context wiring

### Phase 15: Einheiten-Verwaltung
**Goal**: Admin can manage units (apartments) and rooms within buildings for condition tracking
**Depends on**: Phase 14 (property/building hierarchy established)
**Requirements**: UNIT-01, UNIT-02, UNIT-03, UNIT-04
**Success Criteria** (what must be TRUE):
  1. Admin can add units (Wohnungen) to a building with name, floor, and tenant info
  2. Admin can edit unit details and changes persist correctly
  3. Admin can add rooms to a unit with room type and description
  4. Rooms are available in task assignment for Digital Twin condition tracking
**Plans**: 4 plans

Plans:
- [x] 15-01-PLAN.md — Unit API with building filter, POST, PATCH, DELETE
- [x] 15-02-PLAN.md — Room API with full CRUD operations
- [x] 15-03-PLAN.md — Unit management UI (list, create, edit forms)
- [x] 15-04-PLAN.md — Room management UI and unit detail page

### Phase 16: Template-Management
**Goal**: Admin can view, create, and edit project templates through the UI
**Depends on**: Phase 13 (templates may reference partner trades)
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05
**Success Criteria** (what must be TRUE):
  1. Admin sees a list of all templates with name, phase count, and last modified date
  2. Admin can view template details showing phases, packages, and tasks in hierarchy
  3. Admin can create a new template with name and description
  4. Admin can add/edit/remove phases, packages, and tasks within a template
  5. Project creation form shows template dropdown and applies selected template to new project
**Plans**: 5 plans

Plans:
- [x] 16-01-PLAN.md — List enhancements (inactive toggle) and create template page
- [x] 16-02-PLAN.md — Template duplicate API endpoint
- [x] 16-03-PLAN.md — Drag-drop reordering for hierarchy editor
- [x] 16-04-PLAN.md — Project creation with template selection
- [x] 16-05-PLAN.md — Template list phase count and last modified display (gap closure)

### Phase 17: Admin & Onboarding
**Goal**: Admin has overview dashboard, search functionality, and new deployments have guided setup
**Depends on**: Phases 13-16 (all master data modules exist)
**Requirements**: ADMN-01, ADMN-02, ADMN-03, SEED-01, SEED-02, SEED-03, SEED-04
**Success Criteria** (what must be TRUE):
  1. Admin dashboard shows counts for properties, partners, projects, and templates
  2. Quick action buttons provide one-click access to common admin tasks
  3. Partner and template lists have working search/filter functionality
  4. Migrations 045 and 046 are committed with documentation
  5. Demo data script creates realistic test data for development/testing
  6. First-time login triggers setup wizard that creates initial property, building, and partner
  7. README includes deployment instructions for Supabase, Vercel, and environment setup
**Plans**: TBD

Plans:
- [ ] 17-01: Commit and document migrations 045, 046
- [ ] 17-02: Admin overview dashboard with counters
- [ ] 17-03: Search/filter on partner and template lists
- [ ] 17-04: Demo data seed script
- [ ] 17-05: Setup wizard for first-time onboarding
- [ ] 17-06: Deployment README documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 13 -> 14 -> 15 -> 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. Partner-Modul | v2.1 | 4/4 | Complete | 2026-01-22 |
| 14. Multi-Liegenschaft | v2.1 | 5/5 | Complete | 2026-01-24 |
| 15. Einheiten-Verwaltung | v2.1 | 4/4 | Complete | 2026-01-24 |
| 16. Template-Management | v2.1 | 5/5 | Complete | 2026-01-25 |
| 17. Admin & Onboarding | v2.1 | 0/6 | Not started | - |

**Total:** 18/24 plans complete (75%)

---
*Roadmap created: 2026-01-22*
*Phase 13 complete: 2026-01-22*
*Phase 14 complete: 2026-01-24*
*Phase 15 complete: 2026-01-24*
*Phase 16 complete: 2026-01-25*
*Milestone: v2.1 Master Data Management*
