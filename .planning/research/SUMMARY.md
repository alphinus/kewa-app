# Research Summary: v2.2 Extensions

**Project:** KEWA Renovation Operations System
**Domain:** Property renovation management (Swiss context)
**Synthesized:** 2026-01-25
**Confidence:** HIGH

---

## Executive Summary

The v2.2 Extensions milestone adds five feature areas to an already mature 75,000 LOC Next.js 16 + Supabase codebase: Change Orders, Supplier Module, Inspection Workflow, Push Notifications, and Knowledge Base. Research confirms these are well-established patterns in construction/property management software. The existing architecture handles most requirements through database extensions and pattern reuse rather than new libraries or architectural changes. Only two library additions are needed: `web-push` for push notifications and `@next/mdx` for knowledge base content.

The recommended approach is **extend, don't reinvent**. Change Orders should model as work order amendments feeding into existing cost views. Supplier Module extends the existing Partner entity. Inspection Workflow leverages existing quality gates and the work order status machine's `done -> inspected -> closed` flow. Knowledge Base uses MDX for file-based content. Push Notifications integrate with the existing Supabase Realtime and add Web Push API via service worker.

Critical risks are architectural: Change order cost tracking must integrate with existing `project_costs` views (not create parallel tracking). Push notification service worker must merge with existing PWA caching (not create conflicts). VAPID keys must be generated once and stored permanently (not regenerated per deploy). The 2-user internal context means simpler workflows are appropriate - avoid enterprise patterns like multi-tier approvals or complex CMS capabilities.

---

## Key Findings

### Recommended Stack

**Minimal additions required.** The existing stack handles all features except push delivery and MDX rendering.

| Addition | Purpose | Confidence |
|----------|---------|------------|
| `web-push` v3.6.7 | Server-side VAPID push notification delivery | HIGH |
| `@next/mdx` v16.1.4 | MDX processing for knowledge base articles | HIGH |
| `@mdx-js/loader`, `@mdx-js/react` | MDX webpack and React integration | HIGH |
| `remark-gfm`, `rehype-slug`, `rehype-autolink-headings` | Markdown enhancements (tables, heading links) | HIGH |

**No new libraries needed for:**
- Change Orders (database + existing patterns)
- Supplier Module (database + existing Partner entity)
- Inspection Workflow (database + existing quality gates)
- In-app notifications (Supabase Realtime already bundled in @supabase/supabase-js v2.90.1)

**Anti-recommendations:** Firebase Cloud Messaging (external dependency), Contentful/CMS (overkill), Nextra (too heavy), XState (database state machines sufficient).

### Expected Features

**Change Orders:**
- Table stakes: Create CO from work order, cost/schedule impact tracking, approval workflow, audit trail
- Differentiators: CO PDF generation, cumulative tracking per project, photo evidence
- Defer: Multi-tier approval chains, automated RFI integration

**Supplier Module:**
- Table stakes: Supplier CRUD, order creation/tracking, delivery confirmation, invoice linking
- Differentiators: Consumption tracking, reorder alerts, price history
- Defer: IoT tank sensors, automated reordering

**Inspection Workflow:**
- Table stakes: Checklist-based inspection, item-level pass/fail, photo documentation, digital signature
- Differentiators: Snag list generation, re-inspection tracking, Abnahmeprotokoll PDF
- Defer: Third-party inspector management, regulatory certificates

**Push Notifications:**
- Table stakes: Web push subscription, notification preferences, in-app notification center
- Differentiators: Deadline reminders, batch digest
- Defer: SMS, native mobile push, contractor push (use email)

**Knowledge Base:**
- Table stakes: Article CRUD, categories, full-text search, markdown rendering
- Differentiators: Contractor-visible articles, contextual help links
- Defer: Tenant portal, multi-language, AI chatbot

### Architecture Approach

All features integrate with existing patterns. Server Components for dashboards, JSONB-based state machines with PostgreSQL trigger enforcement, polymorphic entity patterns for comments/media, event logging for audit trails.

**New tables:**
- `change_orders` with `change_order_status` enum
- `supplier_products`, `supplier_orders`, `inventory_movements`
- `inspections`, `inspection_items`, `inspection_templates`
- `notification_subscriptions`, `notifications`, `notification_preferences`
- `kb_categories`, `kb_articles`, `kb_article_feedback`

**Modified components:**
- `project_costs` view to include change order amounts and supplier costs
- Work order detail pages to show change orders and trigger inspections
- Header to include notification bell component
- Contractor portal for KB help articles

### Critical Pitfalls

| Priority | Pitfall | Prevention |
|----------|---------|------------|
| CRITICAL | **CO-1: Cost tracking fragmentation** - Change orders as separate entity breaks project cost views | Model change orders as work order amendments, update `project_costs` view in same migration |
| CRITICAL | **PN-1: Service worker conflicts** - Separate push SW conflicts with existing PWA caching | Merge push handling into existing service worker, don't create second SW |
| CRITICAL | **PN-3: VAPID key regeneration** - New keys invalidate all subscriptions | Generate VAPID keys once, store in Vercel environment secrets, never regenerate |
| MODERATE | **IW-4: Disconnected status machine** - Inspection exists parallel to work order status | Integrate with existing `done -> inspected -> closed` transitions via trigger |
| MODERATE | **KB-1: CMS scope creep** - Knowledge base becomes multi-week feature | Time-box to 1 week, use MDX files, single editor, no WYSIWYG |

---

## Implications for Roadmap

### Suggested Phase Structure

Based on dependencies, complexity, and integration requirements:

| Phase | Feature | Rationale |
|-------|---------|-----------|
| 18 | Knowledge Base | Simplest, no dependencies on other v2.2 features, establishes MDX patterns |
| 19 | Supplier Module | Extends existing partners, foundation for material tracking |
| 20 | Change Orders | Core workflow enhancement, integrates with existing cost tracking |
| 21 | Inspection Workflow | Depends on work order flow, leverages quality gates |
| 22 | Push Notifications | Built last so all event sources exist to trigger from |

### Phase Ordering Rationale

1. **Knowledge Base first**: Zero dependencies, immediate value, establishes content patterns that could be referenced by other features (e.g., contextual help for change orders).

2. **Supplier Module second**: Independent of other v2.2 features but provides foundation. Material costs from suppliers feed into project costs (relevant when change orders modify material requirements).

3. **Change Orders third**: Integrates with existing work order and cost systems. Must be complete before inspection workflow since inspections need to handle pending change orders.

4. **Inspection Workflow fourth**: Depends on work order status machine integration. Can generate snag items that might spawn change orders (existing CO system required).

5. **Push Notifications last**: Cross-cutting concern that triggers from all other features. Building it last means all notification sources (change order submitted, inspection scheduled, low stock alert) exist.

### Research Flags

**Needs deeper research during planning:**
- **Phase 22 (Push Notifications)**: iOS PWA installation requirements, service worker merging strategy, Supabase Realtime broadcast patterns

**Standard patterns (skip research-phase):**
- **Phase 18 (Knowledge Base)**: Well-documented MDX patterns, standard CRUD
- **Phase 19 (Supplier Module)**: Standard inventory patterns, extends existing Partner
- **Phase 20 (Change Orders)**: Follows existing work order patterns
- **Phase 21 (Inspection Workflow)**: Mirrors existing quality gate + event patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified npm packages, official Next.js 16 docs, version compatibility confirmed |
| Features | MEDIUM-HIGH | Construction industry patterns documented; pellet-specific needs assumed |
| Architecture | HIGH | Based on direct analysis of existing 75,000 LOC codebase patterns |
| Pitfalls | HIGH | Construction software patterns + existing codebase integration points analyzed |

**Overall confidence:** HIGH

### Gaps to Address

| Gap | How to Handle |
|-----|---------------|
| Pellet consumption tracking specifics | Validate with KEWA during Supplier Module planning - MVP may be order tracking only |
| Contractor push notification scope | Confirm email-only for v2.2, defer push to contractors to future phase |
| Inspection template library | Determine if existing quality gates suffice or need dedicated inspection templates |
| VAPID key storage location | Verify Supabase Vault vs Vercel environment secrets during Push phase planning |

---

## Sources

### Primary (HIGH confidence)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - Push notification patterns
- [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx) - Knowledge base content
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) - In-app notifications
- [web-push npm](https://www.npmjs.com/package/web-push) - v3.6.7 verified
- [@next/mdx npm](https://www.npmjs.com/package/@next/mdx) - v16.1.4 verified
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) - Web standards

### Secondary (MEDIUM confidence)
- [Procore: Change Orders](https://www.procore.com/library/how-construction-change-orders-work)
- [Buildertrend: Construction Handover](https://buildertrend.com/blog/construction-project-handover/)
- [MagicBell: PWA Push Notifications](https://www.magicbell.com/blog/using-push-notifications-in-pwas)
- [KnowledgeOwl: KB Best Practices](https://www.knowledgeowl.com/blog/posts/find-best-knowledge-base-software)

### Codebase Analysis
- Existing state machine patterns (migrations 025/026)
- Event logging patterns (migration 038)
- Quality gates system
- Partner entity structure
- Cost view aggregations

---

*Research completed: 2026-01-25*
*Ready for roadmap: yes*
