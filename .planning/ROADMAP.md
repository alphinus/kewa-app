# Roadmap: KEWA v2.2 Extensions

## Milestones

- **v1.0 MVP** - Phases 1-6 (shipped 2025-03-XX)
- **v2.0 Advanced Features** - Phases 7-12.3 (shipped 2026-01-19)
- **v2.1 Master Data Management** - Phases 13-17 (shipped 2026-01-25)
- **v2.2 Extensions** - Phases 18-24 (in progress)

## Overview

v2.2 extends the renovation workflow with change order management, supplier/procurement tracking, formal inspection workflows, push notifications, and a knowledge base. The milestone follows a dependency-driven order: Knowledge Base first (no dependencies), then Supplier Module (extends Partners), Change Orders (integrates with costs), Inspection Workflow (leverages quality gates), and Push Notifications last (needs all event sources).

## Phases

<details>
<summary>v1.0 MVP (Phases 1-6) - SHIPPED 2025-03-XX</summary>

See milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>v2.0 Advanced Features (Phases 7-12.3) - SHIPPED 2026-01-19</summary>

See milestones/v2.0-ROADMAP.md

</details>

<details>
<summary>v2.1 Master Data Management (Phases 13-17) - SHIPPED 2026-01-25</summary>

See milestones/v2.1-ROADMAP.md

</details>

### v2.2 Extensions (In Progress)

**Milestone Goal:** Extend renovation workflow with change orders, supplier management, inspection workflows, push notifications, and knowledge base.

---

### Phase 18: Knowledge Base
**Goal**: Users can create, organize, and search internal documentation and contractor-visible FAQs with WYSIWYG editing, version history, and approval workflow.
**Depends on**: Nothing (v2.2 starts here)
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, KNOW-06, KNOW-07, KNOW-08, KNOW-09, KNOW-10
**Success Criteria** (what must be TRUE):
  1. User can create a new article with rich text content and see it rendered
  2. User can organize articles into categories and navigate by category
  3. User can search articles and find results by keyword
  4. User can mark articles as contractor-visible and contractors see them in portal
  5. User can view article version history and see who last updated it
**Plans**: 5 plans

Plans:
- [ ] 18-01-PLAN.md — Database schema, types, API scaffolding
- [ ] 18-02-PLAN.md — Tiptap editor, article CRUD UI
- [ ] 18-03-PLAN.md — Category tree, full-text search
- [ ] 18-04-PLAN.md — Attachments, approval workflow
- [ ] 18-05-PLAN.md — Version history, contractor portal, dashboard shortcuts

---

### Phase 19: Supplier Core
**Goal**: Users can manage suppliers, create purchase orders, and track deliveries to invoice.
**Depends on**: Phase 18
**Requirements**: SUPP-01, SUPP-02, SUPP-03, SUPP-04, SUPP-05, SUPP-06, SUPP-07
**Success Criteria** (what must be TRUE):
  1. User can create a supplier (as Partner with type='supplier') with contact info
  2. User can create a purchase order with line items, quantities, and delivery date
  3. User can record delivery confirmation with actual quantities and delivery note
  4. User can link deliveries to invoices for payment tracking
  5. User can view order history per supplier and per property
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md — Database schema (purchase_orders, deliveries), types, supplier API
- [ ] 19-02-PLAN.md — Purchase order CRUD, status workflow, form/list components
- [ ] 19-03-PLAN.md — Deliveries, invoice linking, dashboard pages

---

### Phase 20: Supplier Advanced
**Goal**: Users can track consumption, receive reorder alerts, and analyze pricing trends.
**Depends on**: Phase 19
**Requirements**: SUPP-08, SUPP-09, SUPP-10, SUPP-11, SUPP-12
**Success Criteria** (what must be TRUE):
  1. User can record consumption (tank levels, usage rate) per property
  2. System alerts user when projected stock is low (reorder threshold)
  3. User can view price history chart (CHF/tonne over time)
  4. User can view seasonal consumption patterns
  5. User can create multi-property orders with allocation breakdown
**Plans**: TBD

Plans:
- [ ] 20-01: Consumption tracking and inventory movements
- [ ] 20-02: Reorder alerts and stock projections
- [ ] 20-03: Price history, seasonal patterns, and multi-property orders

---

### Phase 21: Change Orders
**Goal**: Users can create, approve, and track change orders with full cost impact visibility.
**Depends on**: Phase 20
**Requirements**: CHNG-01, CHNG-02, CHNG-03, CHNG-04, CHNG-05, CHNG-06, CHNG-07, CHNG-08, CHNG-09, CHNG-10
**Success Criteria** (what must be TRUE):
  1. User can create a change order linked to work order with cost/schedule impact
  2. Change order follows approval workflow (draft -> submitted -> approved/rejected)
  3. User can attach photo evidence and generate PDF from change order
  4. Dashboard shows cumulative change orders per project with net budget impact
  5. Client can approve change orders via magic-link portal
**Plans**: TBD

Plans:
- [ ] 21-01: Change order schema, CRUD, and work order linking
- [ ] 21-02: Approval workflow, audit trail, and counter-offers
- [ ] 21-03: Photo evidence, PDF generation, and dashboard analytics
- [ ] 21-04: Client portal approval via magic-link

---

### Phase 22: Inspection Core
**Goal**: Users can conduct inspections with checklists, capture defects, and collect signatures.
**Depends on**: Phase 21
**Requirements**: INSP-01, INSP-02, INSP-03, INSP-04, INSP-05, INSP-06, INSP-07, INSP-08
**Success Criteria** (what must be TRUE):
  1. User can create an inspection linked to project/work order with populated checklist
  2. User can mark checklist items as pass/fail/na with photos per item
  3. User can log defects with description and photos
  4. User can capture digital signature from contractor
  5. User can create follow-up tasks from failed checklist items
**Plans**: TBD

Plans:
- [ ] 22-01: Inspection schema and template-based checklists
- [ ] 22-02: Checklist execution with pass/fail and photos
- [ ] 22-03: Defect logging, signatures, and task generation

---

### Phase 23: Inspection Advanced
**Goal**: Users can track re-inspections, generate protocols, and automate room conditions.
**Depends on**: Phase 22
**Requirements**: INSP-09, INSP-10, INSP-11, INSP-12
**Success Criteria** (what must be TRUE):
  1. User can schedule and track re-inspections with parent-child relationship
  2. User can generate PDF inspection protocol (Abnahme-Protokoll)
  3. Contractor can view and acknowledge inspection results via portal
  4. Completed inspections auto-update room conditions based on results
**Plans**: TBD

Plans:
- [ ] 23-01: Re-inspection scheduling and parent-child tracking
- [ ] 23-02: PDF Abnahme-Protokoll generation
- [ ] 23-03: Contractor portal integration and room condition automation

---

### Phase 24: Push Notifications
**Goal**: Users receive timely push notifications for workflow events with preference controls.
**Depends on**: Phase 23
**Requirements**: PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05, PUSH-06, PUSH-07, PUSH-08, PUSH-09, PUSH-10, PUSH-11, PUSH-12
**Success Criteria** (what must be TRUE):
  1. User can enable push notifications and receive them in browser
  2. User can configure notification preferences (types, quiet hours, digest mode)
  3. User receives push when work order status changes or approval is needed
  4. User can view in-app notification center and mark notifications read/unread
  5. Clicking notification navigates to relevant entity
**Plans**: TBD

Plans:
- [ ] 24-01: Service worker, VAPID setup, and subscription management
- [ ] 24-02: Notification preferences and quiet hours
- [ ] 24-03: Event triggers (work orders, approvals, deadlines)
- [ ] 24-04: In-app notification center with navigation

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 18. Knowledge Base | v2.2 | 0/5 | Planned | - |
| 19. Supplier Core | v2.2 | 0/3 | Planned | - |
| 20. Supplier Advanced | v2.2 | 0/3 | Not started | - |
| 21. Change Orders | v2.2 | 0/4 | Not started | - |
| 22. Inspection Core | v2.2 | 0/3 | Not started | - |
| 23. Inspection Advanced | v2.2 | 0/3 | Not started | - |
| 24. Push Notifications | v2.2 | 0/4 | Not started | - |

---

*Created: 2026-01-25*
*56 requirements mapped across 7 phases (18-24)*
