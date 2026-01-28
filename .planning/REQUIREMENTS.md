# Requirements: v2.2 Extensions

**Milestone:** v2.2 Extensions
**Created:** 2026-01-25
**Status:** Active

## Change Orders (CHNG)

- [x] **CHNG-01**: User can create a change order linked to work order or project
- [x] **CHNG-02**: User can specify scope description, cost impact (original vs. revised), and schedule impact
- [x] **CHNG-03**: User can classify change reason (owner_request, unforeseen_conditions, design_error, site_conditions)
- [x] **CHNG-04**: Change order follows approval workflow (draft → submitted → approved/rejected)
- [x] **CHNG-05**: All change order events are logged in audit trail
- [x] **CHNG-06**: User can attach photo evidence to change orders
- [x] **CHNG-07**: Contractor can propose counter-offer on change order cost/scope
- [x] **CHNG-08**: User can generate PDF document from change order
- [x] **CHNG-09**: Dashboard shows cumulative change orders per project with net budget impact
- [x] **CHNG-10**: Client can approve change orders via magic-link portal

## Supplier Module (SUPP)

- [ ] **SUPP-01**: User can create/edit suppliers (extends Partners with type='supplier')
- [ ] **SUPP-02**: User can create purchase orders with quantity, unit price, delivery date
- [ ] **SUPP-03**: Purchase order follows status workflow (ordered → confirmed → delivered → invoiced)
- [ ] **SUPP-04**: User can record delivery (actual date, quantity received, delivery note number)
- [ ] **SUPP-05**: Deliveries are associated with properties/buildings
- [ ] **SUPP-06**: Deliveries can be linked to invoices for payment tracking
- [ ] **SUPP-07**: User can view order history per supplier and property
- [x] **SUPP-08**: User can track consumption (tank levels, usage rate)
- [x] **SUPP-09**: System alerts when projected stock runs low (reorder alerts)
- [x] **SUPP-10**: User can view price history (CHF/tonne over time)
- [x] **SUPP-11**: User can view seasonal consumption patterns
- [x] **SUPP-12**: User can create multi-property orders with allocation

## Inspection/Abnahme Workflow (INSP)

- [ ] **INSP-01**: User can create inspection linked to project or work order
- [ ] **INSP-02**: Inspection checklist is populated from quality gate template
- [ ] **INSP-03**: User can mark each checklist item as pass/fail/na
- [ ] **INSP-04**: User can attach photos per checklist item
- [ ] **INSP-05**: User can log defects/snags with description and photos
- [ ] **INSP-06**: Inspection records inspector, date/time, and overall result (passed/passed_with_conditions/failed)
- [ ] **INSP-07**: User can capture digital signature from contractor
- [ ] **INSP-08**: User can create follow-up tasks from failed checklist items
- [ ] **INSP-09**: User can schedule and track re-inspections (parent-child relationship)
- [ ] **INSP-10**: User can generate PDF inspection protocol (Abnahme-Protokoll)
- [ ] **INSP-11**: Contractor can view and acknowledge inspection results via portal
- [ ] **INSP-12**: Completed inspections auto-update room conditions based on results

## Push Notifications (PUSH)

- [ ] **PUSH-01**: App supports web push via service worker and Push API
- [ ] **PUSH-02**: User can enable/disable notification types in preferences
- [ ] **PUSH-03**: User receives push when work order status changes (sent, accepted, rejected)
- [ ] **PUSH-04**: User receives push when approval is needed (invoice, change order)
- [ ] **PUSH-05**: App shows in-app notification center with recent notifications
- [ ] **PUSH-06**: User can mark notifications as read/unread
- [ ] **PUSH-07**: Clicking notification navigates to relevant entity
- [ ] **PUSH-08**: Contractors can receive push notifications if permitted
- [ ] **PUSH-09**: User receives reminder before acceptance deadline expires
- [ ] **PUSH-10**: User can opt for daily digest instead of individual notifications
- [ ] **PUSH-11**: Notifications show urgency levels (urgent/normal/info)
- [ ] **PUSH-12**: User can set quiet hours (no notifications during specified times)

## Knowledge Base (KNOW)

- [ ] **KNOW-01**: User can create/edit/delete knowledge base articles
- [ ] **KNOW-02**: Articles are organized by categories
- [ ] **KNOW-03**: Articles support markdown formatting
- [ ] **KNOW-04**: User can search articles with full-text search
- [ ] **KNOW-05**: Articles show view count, last updated timestamp, and author
- [ ] **KNOW-06**: Some articles can be marked visible to contractors (FAQ section in portal)
- [ ] **KNOW-07**: Articles can link to related articles
- [ ] **KNOW-08**: Articles can have file attachments (PDFs, images)
- [ ] **KNOW-09**: Articles maintain version history
- [ ] **KNOW-10**: User can pin important articles as dashboard shortcuts

---

## Future Requirements (Deferred)

*From user discussion — noted for v2.3+:*

- Warranty tracking for completed work
- Contractor ratings/reviews
- Time tracking per task
- Budget forecasting
- Bulk operations
- Central document repository
- Enhanced Gantt charts
- Email for critical events
- iCal export

## Out of Scope

- Multi-tier approval chains (only 2 internal users)
- Automated change order generation from RFIs
- SMS notifications
- Native mobile push (web push sufficient)
- IoT tank sensor integration
- Automated reordering
- AI chatbot for knowledge base
- Tenant-facing FAQ (deferred to v3.0 Tenant Portal)

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| KNOW-01 | 18 | Pending |
| KNOW-02 | 18 | Pending |
| KNOW-03 | 18 | Pending |
| KNOW-04 | 18 | Pending |
| KNOW-05 | 18 | Pending |
| KNOW-06 | 18 | Pending |
| KNOW-07 | 18 | Pending |
| KNOW-08 | 18 | Pending |
| KNOW-09 | 18 | Pending |
| KNOW-10 | 18 | Pending |
| SUPP-01 | 19 | Pending |
| SUPP-02 | 19 | Pending |
| SUPP-03 | 19 | Pending |
| SUPP-04 | 19 | Pending |
| SUPP-05 | 19 | Pending |
| SUPP-06 | 19 | Pending |
| SUPP-07 | 19 | Pending |
| SUPP-08 | 20 | Complete |
| SUPP-09 | 20 | Complete |
| SUPP-10 | 20 | Complete |
| SUPP-11 | 20 | Complete |
| SUPP-12 | 20 | Complete |
| CHNG-01 | 21 | Complete |
| CHNG-02 | 21 | Complete |
| CHNG-03 | 21 | Complete |
| CHNG-04 | 21 | Complete |
| CHNG-05 | 21 | Complete |
| CHNG-06 | 21 | Complete |
| CHNG-07 | 21 | Complete |
| CHNG-08 | 21 | Complete |
| CHNG-09 | 21 | Complete |
| CHNG-10 | 21 | Complete |
| INSP-01 | 22 | Pending |
| INSP-02 | 22 | Pending |
| INSP-03 | 22 | Pending |
| INSP-04 | 22 | Pending |
| INSP-05 | 22 | Pending |
| INSP-06 | 22 | Pending |
| INSP-07 | 22 | Pending |
| INSP-08 | 22 | Pending |
| INSP-09 | 23 | Pending |
| INSP-10 | 23 | Pending |
| INSP-11 | 23 | Pending |
| INSP-12 | 23 | Pending |
| PUSH-01 | 24 | Pending |
| PUSH-02 | 24 | Pending |
| PUSH-03 | 24 | Pending |
| PUSH-04 | 24 | Pending |
| PUSH-05 | 24 | Pending |
| PUSH-06 | 24 | Pending |
| PUSH-07 | 24 | Pending |
| PUSH-08 | 24 | Pending |
| PUSH-09 | 24 | Pending |
| PUSH-10 | 24 | Pending |
| PUSH-11 | 24 | Pending |
| PUSH-12 | 24 | Pending |

---

*Created: 2026-01-25*
*56 requirements across 5 categories*
