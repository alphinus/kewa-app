# Features Research: v2.2 Extensions

**Domain:** Property renovation management (Swiss context)
**Researched:** 2026-01-25
**Confidence:** MEDIUM (WebSearch-based, verified against industry patterns)

## Executive Summary

The v2.2 extensions (Change Orders, Supplier Module, Inspection Workflow, Push Notifications, Knowledge Base) are well-established patterns in construction and property management software. For KEWA's 2-user context with external contractor integration, the focus should be on implementing table stakes features that integrate cleanly with the existing v2.0/v2.1 infrastructure. The complexity is manageable because most patterns already exist in the codebase (work order status workflows, PDF generation, contractor portal, quality gates).

**Key insight:** Change Orders and Inspection Workflow are closely related to existing Work Orders. They extend rather than replace current functionality.

---

## Change Orders

Change orders are formal amendments to renovation contracts that modify scope, cost, or schedule during active projects. Critical for renovation work where unforeseen conditions frequently arise.

### Table Stakes

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Change order creation | Create CO from existing work order or project | Low | Links to work_orders table |
| Scope description | Text field describing what changed | Low | Required field |
| Cost impact tracking | Original vs. revised cost with delta calculation | Low | Uses existing cost fields pattern |
| Schedule impact | Days added/removed, new dates | Low | Uses existing date patterns |
| Reason classification | Enum: owner_request, unforeseen_conditions, design_error, site_conditions | Low | Standard categories |
| Approval workflow | Status: draft > submitted > approved/rejected | Medium | Similar to invoice approval |
| Linked entities | Connect to work order, project, partner | Low | Foreign keys |
| Audit trail | Who created, submitted, approved, when | Low | Existing audit_log pattern |

### Differentiators

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Photo evidence attachment | Before/after photos documenting change reason | Low | Existing media system |
| Counter-offer on changes | Contractor can propose alternative cost/scope | Medium | Similar to work order counter-offers |
| Change order PDF generation | Formal document for signatures | Medium | Extend existing PDF pattern |
| Cumulative CO tracking | Dashboard showing total COs per project, net budget impact | Medium | Aggregation view |
| Client approval via portal | External approval link (like work order magic link) | Medium | Extend contractor portal pattern |

### Anti-Features

| Feature | Why Not |
|---------|---------|
| Complex multi-tier approval chains | Only 2 internal users; overkill |
| Automated CO generation from RFIs | No RFI system exists; manual control preferred |
| Legal contract amendment clauses | Out of scope; focus on operational tracking |
| Change order insurance/bonding | Financial instruments beyond operational scope |

---

## Supplier Module (Pellets)

Pellet/fuel tracking for property heating systems. Distinct from contractor work orders - this is consumable material ordering and inventory.

### Table Stakes

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Supplier CRUD | Name, contact, payment terms, notes | Low | Extend partners table with type='supplier' |
| Order creation | Quantity, unit price, delivery date | Low | New orders table |
| Order status tracking | ordered > confirmed > delivered > invoiced | Low | Simple status workflow |
| Delivery recording | Actual delivery date, quantity received, delivery note number | Low | Basic fields |
| Property/unit association | Which building(s) received the delivery | Low | Foreign key to properties |
| Invoice linking | Connect delivery to invoice for payment | Low | Extend invoices table |
| Basic history | View past orders per supplier and property | Low | Standard list view |

### Differentiators

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Consumption tracking | Record tank levels, calculate usage rate | Medium | New consumption_logs table |
| Reorder alerts | Notify when projected stock runs low | Medium | Requires consumption data + threshold logic |
| Price history | Track CHF/tonne over time for budgeting | Low | Historical records |
| Seasonal planning | View annual consumption patterns | Medium | Aggregation + visualization |
| Multi-property ordering | Single order distributed across buildings | Medium | Junction table for allocations |

### Anti-Features

| Feature | Why Not |
|---------|---------|
| IoT tank sensor integration | Infrastructure complexity; manual recording sufficient |
| Automated reordering | KEWA wants manual control over purchases |
| Supplier comparison/bidding | Single-property focus; manual selection preferred |
| Commodity price feeds | Over-engineering for pellet tracking |

---

## Inspection/Abnahme Workflow

Formal handover inspection at project or work order completion. "Abnahme" is the Swiss/German term for acceptance inspection - critical for formal project closeout.

### Table Stakes

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Inspection creation | Create inspection linked to project or work order | Low | New inspections table |
| Checklist from template | Quality gate checklist items copied to inspection | Low | Uses existing quality_gates |
| Item-by-item status | Each checklist item: pass/fail/na | Low | JSONB checklist with status |
| Photo documentation | Required completion photos per item | Low | Existing media system |
| Defect/snag logging | Document issues found during inspection | Medium | Snag list functionality |
| Inspector assignment | Who performed the inspection | Low | User reference |
| Inspection date/time | When the inspection occurred | Low | Timestamp fields |
| Overall result | Passed/passed_with_conditions/failed | Low | Simple enum |
| Signature capture | Digital signature from contractor (acknowledgment) | Medium | Base64 image storage |

### Differentiators

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Defect follow-up workflow | Create follow-up tasks from failed items | Medium | Generate tasks from snags |
| Re-inspection tracking | Schedule and track follow-up inspections | Medium | Parent-child inspection relationship |
| Inspection PDF report | Formal Abnahme protocol document | Medium | PDF generation with checklist, photos, signatures |
| Contractor acknowledgment via portal | Contractor views and acknowledges inspection results | Medium | Extend magic link portal |
| Condition updates | Auto-update room conditions based on inspection results | Medium | Trigger condition_history updates |

### Anti-Features

| Feature | Why Not |
|---------|---------|
| Third-party inspector management | No external inspectors; KEWA inspects internally |
| Regulatory compliance certificates | Legal certification out of scope |
| Automated inspection scheduling | Manual scheduling preferred |
| Inspector certification tracking | No external inspectors to certify |

---

## Push Notifications

Real-time alerts for project updates, approvals needed, and status changes. Critical for mobile-first contractor experience.

### Table Stakes

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Web push subscription | Service worker + push API for browser notifications | Medium | PWA pattern |
| Notification preferences | User can enable/disable notification types | Low | User settings |
| Work order status alerts | Notify when work order sent, accepted, rejected | Low | Trigger on status change |
| Approval requests | Alert when invoice/change order needs approval | Low | Trigger on submission |
| In-app notification center | List of recent notifications | Medium | notifications table + UI |
| Read/unread tracking | Mark notifications as read | Low | Boolean flag |
| Click-through to source | Notification links to relevant entity | Low | URL/route reference |

### Differentiators

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Contractor magic-link notifications | Push to contractor's browser if permitted | Medium | Token-scoped subscriptions |
| Deadline reminders | Alert X hours before acceptance deadline expires | Medium | Scheduled notification logic |
| Batch digest | Daily summary instead of individual pings | Medium | Aggregation + scheduling |
| Urgency levels | Different treatment for urgent vs. informational | Low | Priority field + visual distinction |
| Quiet hours | Respect user's preferred notification windows | Low | Time-based filtering |

### Anti-Features

| Feature | Why Not |
|---------|---------|
| SMS notifications | Cost + complexity; web push sufficient for 2 users |
| Native mobile push | PWA web push sufficient; no native app |
| Email notifications for everything | Explicit project decision to avoid email spam |
| AI-prioritized notifications | Over-engineering for small user base |

---

## Knowledge Base

FAQ and documentation system for internal reference and potentially contractor guidance. Simple, searchable content repository.

### Table Stakes

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Article CRUD | Create/edit knowledge base articles | Low | New articles table |
| Categories | Organize articles by topic (renovation, contractors, finance, etc.) | Low | Category field or junction table |
| Rich text content | Markdown or HTML content with formatting | Low | Text field + renderer |
| Search | Full-text search across articles | Medium | PostgreSQL full-text search |
| View count | Track article popularity | Low | Counter field |
| Last updated timestamp | Show freshness of content | Low | Automatic timestamp |
| Author attribution | Who wrote/updated the article | Low | User reference |

### Differentiators

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Contractor FAQ section | Articles visible to contractors via portal | Medium | Visibility flag + portal rendering |
| Related articles | Link related content | Low | Self-referential relationship |
| File attachments | PDFs, images, documents attached to articles | Low | Existing media/storage pattern |
| Article versioning | Track changes over time | Medium | Version history table |
| Quick-access shortcuts | Pin important articles to dashboard | Low | Boolean flag + display logic |

### Anti-Features

| Feature | Why Not |
|---------|---------|
| Tenant-facing FAQ | Tenant portal is Phase 3; defer |
| AI chatbot | Over-engineering; simple search sufficient |
| External content embedding | Security/maintenance concerns |
| Legal advice articles | Explicit out-of-scope per PROJECT.md |
| Multi-language support | German-only for KEWA's operational context |
| Comment/discussion threads | 2 internal users; verbal communication sufficient |

---

## Dependencies on Existing Features

### Change Orders Depend On:
- **Work Orders (v2.0):** Change orders modify existing work orders or spawn from them
- **Partners (v2.1):** Contractor association for approval routing
- **Offers/Invoices (v2.0):** Cost tracking patterns, potential invoice generation from approved COs
- **Audit Log (v2.0):** Tracking all CO lifecycle events
- **PDF Generation (v2.0):** Document generation pattern for CO PDFs

### Supplier Module Depends On:
- **Partners Table (v2.1):** Extend partner type to include 'supplier' explicitly (already exists as enum)
- **Properties/Buildings (v2.1):** Link deliveries to buildings
- **Invoices/Payments (v2.0):** Payment workflow for supplier invoices
- **Expense Categories (v2.0):** May add 'fuel' or 'materials' category

### Inspection Workflow Depends On:
- **Quality Gates (v2.0):** Template-based checklists for inspections
- **Work Orders (v2.0):** Inspection triggers at work order 'done' status
- **Renovation Projects (v2.0):** Project-level inspections
- **Media System (v2.0):** Photo documentation
- **Condition Tracking (v2.0):** Update room conditions based on inspection results
- **Contractor Portal (v2.0):** Contractor acknowledgment of inspection results

### Push Notifications Depend On:
- **Users Table (v2.0):** Subscription storage per user
- **Work Orders (v2.0):** Status change triggers
- **Invoices (v2.0):** Approval request triggers
- **Change Orders (v2.2):** Approval request triggers (circular dependency - build notifications first with work order triggers, then add CO triggers)

### Knowledge Base Depends On:
- **Users Table (v2.0):** Author tracking
- **Media/Storage (v2.0):** File attachments
- **Contractor Portal (v2.0):** Optional contractor-visible articles

---

## Complexity Assessment

| Feature Area | Overall Complexity | Rationale |
|--------------|-------------------|-----------|
| Change Orders | **Medium** | New entity with status workflow, but follows existing patterns (work orders, invoices). PDF generation adds complexity. |
| Supplier Module | **Low-Medium** | Simple CRUD + order tracking. Consumption tracking adds medium complexity if included. |
| Inspection Workflow | **Medium** | Checklist evaluation, snag tracking, signature capture, integration with quality gates. PDF report generation. |
| Push Notifications | **Medium-High** | Service worker setup, subscription management, trigger integration across multiple entities. PWA infrastructure. |
| Knowledge Base | **Low** | Standard CRUD + search. Well-understood pattern. |

### Recommended Phase Order

Based on complexity, dependencies, and independent value:

1. **Knowledge Base** (Low complexity, no dependencies on other v2.2 features, provides immediate value)
2. **Supplier Module** (Low-Medium, independent of other v2.2 features)
3. **Change Orders** (Medium, builds on existing work order patterns)
4. **Inspection Workflow** (Medium, leverages quality gates, can trigger from work orders)
5. **Push Notifications** (Medium-High, needs entities to trigger from, requires PWA infrastructure)

---

## Feature Integration Patterns

### Existing Patterns to Reuse

| Pattern | Used In | Reuse For |
|---------|---------|-----------|
| Status workflow enum + timestamps | work_orders, invoices | change_orders, supplier_orders, inspections |
| Magic link portal | contractor portal | contractor acknowledgment of inspections |
| PDF generation | work order PDF | change order PDF, inspection protocol PDF |
| Counter-offer flow | work order counter-offers | change order negotiation |
| Quality gate checklists | template_quality_gates | inspection checklists |
| Media attachments | work orders, tasks | change orders, inspections, articles |
| Audit logging | all entities | all new entities |

### New Patterns Needed

| Pattern | Feature | Notes |
|---------|---------|-------|
| Service worker + push API | Push Notifications | First PWA feature |
| Full-text search | Knowledge Base | PostgreSQL tsvector |
| Signature capture | Inspections | Canvas-based drawing → base64 |
| Snag/defect tracking | Inspections | List of issues with status |
| Consumption logs | Supplier Module (differentiator) | Time-series data |

---

## Swiss/German Context Considerations

| Term | English | Usage |
|------|---------|-------|
| Abnahme | Acceptance/Handover Inspection | Formal inspection protocol |
| Mängelliste | Snag list / Punch list | Defects found during inspection |
| Nachbesserung | Rectification | Follow-up work to fix defects |
| Lieferant | Supplier | Pellet/material suppliers |
| Nachtrag | Change order / Addendum | Contract modification |

These terms should be used in the German UI where appropriate.

---

## Sources

### Change Orders
- [Buildertrend - Change Order Software](https://buildertrend.com/project-management/construction-change-order-software/)
- [Procore - How Change Orders Work](https://www.procore.com/library/how-construction-change-orders-work)
- [CM Fusion - Change Orders](https://www.cmfusion.com/features/change-orders)
- [Linarc - Types of Change Orders](https://www.linarc.com/buildspace/what-are-the-different-types-of-change-orders-in-construction)
- [SmartPM - Mastering Change Orders](https://smartpm.com/blog/mastering-change-orders-in-construction)

### Inspection Workflow
- [GoAudits - Construction Handover](https://goaudits.com/blog/construction-handover/)
- [Procore - Final Inspection](https://www.procore.com/library/final-inspection)
- [GoAudits - Snagging Apps](https://goaudits.com/blog/best-snagging-app-snag-list-software/)
- [Fluix - Punch List Workflow](https://fluix.io/punch-list-workflow)
- [Workyard - Punch List Software](https://www.workyard.com/compare/punch-list-software)

### Supplier/Materials
- [Four Data - Smart Pellet Management](https://fourdata.io/smart-pellet-management-optimized-market-solutions/)
- [Precoro - Construction Procurement](https://precoro.com/customers/construction)
- [Current SCM - Procurement Software](https://currentscm.com/solutions/procurement-software/)

### Push Notifications
- [Reteno - Push Notification Best Practices 2026](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026)
- [MDN - Web Push API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices)
- [MagicBell - Notification System Design](https://www.magicbell.com/blog/notification-system-design)
- [Analytics Insight - PWA Push Notifications Guide](https://www.analyticsinsight.net/tech-news/the-complete-guide-to-pwa-push-notifications-features-best-practices-installation-steps)

### Knowledge Base
- [Rentec Direct - Property Management Software 2026](https://www.rentecdirect.com/blog/best-property-management-software-2026/)
- [Guesty - Must-have PM Features 2026](https://www.guesty.com/blog/must-have-property-management-software-features/)
- [Desk365 - Knowledge Base Software](https://www.desk365.io/blog/best-knowledge-base-software/)

---

## Metadata

**Confidence breakdown:**
- Change Orders: MEDIUM-HIGH - Well-established construction industry patterns
- Supplier Module: MEDIUM - Pellet-specific info limited; general procurement patterns applied
- Inspection Workflow: MEDIUM-HIGH - Standard Abnahme process, punch list patterns documented
- Push Notifications: HIGH - PWA patterns well-documented
- Knowledge Base: HIGH - Standard CRUD + search patterns

**Research date:** 2026-01-25
**Valid until:** 2026-04-25 (feature patterns stable, 90-day relevance)
