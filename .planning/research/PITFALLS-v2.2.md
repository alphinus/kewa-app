# Pitfalls Research: v2.2 Extensions

**Researched:** 2026-01-25
**Domain:** Adding Change Orders, Supplier Module, Inspection Workflows, Push Notifications, Knowledge Base to existing renovation management system
**Context:** KEWA AG property management, ~75,000 LOC TypeScript, Next.js 16 + Supabase, 2 internal users + external contractors
**Confidence:** MEDIUM-HIGH (verified patterns from construction software, PWA documentation, and existing codebase analysis)

---

## Change Orders

### Pitfall CO-1: Change Orders as Separate Entity from Work Orders

**What goes wrong:** Creating a completely separate `change_orders` table disconnected from the existing `work_orders` table. This leads to cost tracking fragmentation - the `project_costs` view and cost aggregation queries don't see change order amounts, creating incorrect project totals.

**Warning signs:**
- Project cost summary doesn't match reality
- Change order costs not appearing in cost dashboards
- Duplicate logic for cost calculations in change orders vs work orders
- "Where did this extra cost come from?" questions from KEWA

**Prevention:**
1. **Model change orders as amendments to work orders** - Create a `work_order_changes` table that references the parent `work_order_id` and tracks delta amounts (cost_delta, schedule_delta)
2. **Extend existing cost views** - Update `project_costs` view to include: `original_cost + SUM(change_order_deltas)`
3. **Reuse the offer/invoice workflow** - Change orders should generate their own offers and invoices linked to the parent work order, not bypass the existing cost tracking

**Phase impact:** Phase 1 (Change Orders) - Database schema decision is foundational. Getting this wrong means rewriting cost tracking.

---

### Pitfall CO-2: Missing Approval Authority Definition

**What goes wrong:** Implementing change orders without clear approval thresholds. Every change goes to the same person regardless of impact, creating bottlenecks. Or worse, changes get approved by anyone, leading to scope creep.

**Warning signs:**
- All change orders queue up waiting for one person
- Small changes (CHF 100) have same approval friction as large (CHF 10,000)
- Unauthorized changes approved without proper review
- "Who approved this?" disputes

**Prevention:**
1. **Define approval thresholds in PROJECT.md** - e.g., <CHF 500 = project manager, >CHF 500 = admin
2. **For 2-user system, keep simple** - All change orders require admin approval (KEWA AG). Don't over-engineer tiers.
3. **Log approver in audit trail** - `approved_by` and `approved_at` fields, leveraging existing `audit_log` infrastructure

**Phase impact:** Phase 1 (Change Orders) - Define in requirements before implementation.

---

### Pitfall CO-3: No Link Between Change Order and Original Scope

**What goes wrong:** Change order UI shows "Add CHF 2,000 for tile upgrade" but doesn't show what the original specification was. Users can't evaluate if the change is reasonable without context.

**Warning signs:**
- Change order reviewers ask "what was the original scope?"
- Screenshots of original work order attached as workarounds
- Disputes about whether something was "in scope" originally

**Prevention:**
1. **Display original work order scope** - Change order form shows readonly original `scope_of_work` field
2. **Require change justification** - Add `reason` field (enum: client_request, site_condition, design_change, error_correction)
3. **Version the scope** - Store original scope, track modifications. Consider JSONB `scope_history` field.

**Phase impact:** Phase 1 (Change Orders) - UX design requirement.

---

### Pitfall CO-4: Status Machine Conflicts with Existing Work Order States

**What goes wrong:** Existing work order status machine (`draft -> sent -> viewed -> accepted -> in_progress -> done -> inspected -> closed`) doesn't account for change orders mid-execution. A work order in `in_progress` receives a change order - what happens?

**Warning signs:**
- Database constraint errors when updating work order with change order
- Work order stuck in unexpected state
- Change order can be submitted against `closed` work order
- No visibility of pending change orders during work order execution

**Prevention:**
1. **Don't change parent work order status** - Change orders have their own status workflow (`draft -> pending_approval -> approved -> rejected`)
2. **Add `has_pending_changes` flag** - Boolean on work order, set true when unapproved change orders exist
3. **Block inspection if pending changes** - Work order can't transition to `inspected` if `has_pending_changes = true`
4. **Allow changes only on active work orders** - Validate `parent_work_order.status IN ('accepted', 'in_progress', 'blocked', 'done')`

**Phase impact:** Phase 1 (Change Orders) - State machine design is critical.

---

### Pitfall CO-5: Cost Impact Not Visible at Project Level

**What goes wrong:** Change orders approved at work order level, but project budget dashboard doesn't reflect cumulative impact until too late. Project goes over budget without early warning.

**Warning signs:**
- Project budget shows green even when over budget due to changes
- Monthly cost review reveals "surprise" overruns
- No aggregation of pending vs approved changes

**Prevention:**
1. **Update project cost view** - Include columns: `original_estimated`, `approved_changes`, `pending_changes`, `current_total`
2. **Budget variance alerts** - If `approved_changes > 10% of original_estimated`, flag for review
3. **Show on project dashboard** - Existing project cost dashboard needs change order section

**Phase impact:** Phase 1 (Change Orders) - Dashboard integration required, not separate reporting.

---

## Supplier Module

### Pitfall SM-1: Treating Suppliers Like Contractors

**What goes wrong:** Reusing the `partners` table `supplier` type without supplier-specific fields. Suppliers don't receive work orders - they fulfill material orders. Different workflow, different data model.

**Warning signs:**
- Supplier records missing pricing/catalog info
- No purchase order concept, only work orders
- Material costs tracked as generic "expenses" without supplier link
- Can't answer "which supplier provided materials for project X?"

**Prevention:**
1. **Extend partners table for suppliers** - Add: `default_payment_terms`, `catalog_url`, `tax_id` (for Swiss compliance)
2. **Create `purchase_orders` table** - Not work orders. Fields: `supplier_id`, `project_id`, `items`, `delivery_date`, `delivery_address`
3. **Link to expenses** - `expenses.purchase_order_id` foreign key for traceability
4. **Separate from contractor workflow** - Suppliers don't need magic-link portal, acceptance workflow, or work order status machine

**Phase impact:** Phase 2 (Supplier Module) - Data model decision upfront.

---

### Pitfall SM-2: Pellets Tracking Without Consumption Model

**What goes wrong:** Tracking pellet orders but not consumption. You know you ordered 5 tons but not how much remains or when to reorder.

**Warning signs:**
- Manual tracking of pellet inventory outside system
- "How much pellets do we have?" requires checking physical storage
- No reorder alerts, discover empty during heating season

**Prevention:**
1. **Track inventory levels** - `supplier_inventory` table: `product_id`, `location_id`, `quantity_on_hand`, `reorder_threshold`
2. **Record deliveries and consumption** - `inventory_transactions` table: `type (delivery|consumption|adjustment)`, `quantity`, `date`
3. **Start simple** - MVP: manual consumption entry. Don't automate until usage patterns are clear.
4. **Consider location** - Pellets stored at specific buildings. Track per-building inventory if multiple properties.

**Phase impact:** Phase 2 (Supplier Module) - Design inventory model for expansion, even if v2.2 only tracks pellets.

---

### Pitfall SM-3: No Delivery Confirmation Workflow

**What goes wrong:** Purchase order created, marked as "ordered," then forgotten. No confirmation that delivery happened. Supplier invoices don't reconcile with received materials.

**Warning signs:**
- Invoices paid for materials not received
- "Did we get that delivery?" questions
- No audit trail of who received delivery

**Prevention:**
1. **Simple delivery confirmation** - Purchase order status: `draft -> ordered -> delivered -> invoiced`
2. **Capture delivery details** - `delivered_at`, `received_by`, `delivery_note_number`
3. **Allow partial delivery** - `delivered_quantity` vs `ordered_quantity` per line item
4. **Match to invoice** - Invoice references purchase order, validates amounts

**Phase impact:** Phase 2 (Supplier Module) - Include in initial implementation.

---

### Pitfall SM-4: Mixing Supplier Invoices with Contractor Invoices

**What goes wrong:** Using existing `invoices` table for supplier invoices creates confusion. Contractor invoices link to work orders; supplier invoices link to purchase orders. Different relationships, different views needed.

**Warning signs:**
- Invoice list shows mixed contractor/supplier invoices without context
- Filtering by work order misses supplier invoices
- Cost reports confuse labor (contractor) vs material (supplier) costs

**Prevention:**
1. **Same table, different type** - Add `invoice_type` enum: `contractor | supplier`
2. **Nullable foreign keys** - `work_order_id` for contractor, `purchase_order_id` for supplier (mutually exclusive)
3. **Separate dashboard views** - Contractor invoices and supplier invoices as separate tabs/filters
4. **Cost breakdown** - Project costs show: contractor costs + supplier costs = total

**Phase impact:** Phase 2 (Supplier Module) - Schema design consideration.

---

## Inspection Workflow

### Pitfall IW-1: Inspection Without Checklist Items

**What goes wrong:** Inspection is a single "approved/rejected" action without structured checklist. Inspector can't document what passed vs what needs rework. No evidence for disputes.

**Warning signs:**
- Inspection results are "rejected" with no specifics
- Contractor doesn't know what to fix
- Re-inspection fails on same items (weren't documented first time)
- Legal disputes lack evidence

**Prevention:**
1. **Template-based inspection checklists** - Reuse existing template system. Inspection template defines checkpoints.
2. **Item-level pass/fail** - Each checkpoint: `status (pass|fail|na)`, `notes`, `photo_ids`
3. **Require photos for failures** - Can't mark item "fail" without attached evidence
4. **Store inspection results** - `inspections` table with `inspection_items` child table

**Phase impact:** Phase 3 (Inspection Workflow) - Design checklist system from start.

---

### Pitfall IW-2: Inspection Blocks Everything Without Partial Approval

**What goes wrong:** Work order marked "done" by contractor, but one small item fails inspection. Entire work order blocked, contractor can't proceed with other work, payment held up for minor issue.

**Warning signs:**
- Contractors frustrated by blocked payments
- Multiple small fixes create bottleneck
- "Can't we just approve the 95% that's done?"

**Prevention:**
1. **Inspection can result in conditional approval** - Status: `approved | approved_with_conditions | rejected`
2. **Track snag list separately** - Inspection can generate "snag items" that don't block main work order closure
3. **Retention support** - Allow payment of main amount, hold retention until snags cleared
4. **Snag workflow** - Minor fixes don't need full work order process

**Phase impact:** Phase 3 (Inspection Workflow) - Status model design.

---

### Pitfall IW-3: No Clear Inspector Role

**What goes wrong:** Who performs the inspection? System assumes KEWA AG, but what about third-party inspectors? What about tenant sign-off?

**Warning signs:**
- Inspection field left blank
- "Who should inspect this?" questions
- No notification to inspector
- Can't track inspector performance

**Prevention:**
1. **For v2.2, keep simple** - Inspector is always KEWA AG user. Don't over-engineer roles.
2. **Store inspector reference** - `inspected_by` foreign key to users table
3. **Future-proof** - Schema supports external inspector concept even if not implemented
4. **Tenant sign-off is separate** - If needed later, this is a different approval type, not inspection

**Phase impact:** Phase 3 (Inspection Workflow) - Scope decision.

---

### Pitfall IW-4: Disconnected from Work Order Status Machine

**What goes wrong:** Inspection workflow exists in parallel to work order status, not integrated. Work order can be "closed" without inspection. Inspection results don't update work order status.

**Warning signs:**
- Work orders closed without inspection
- Inspection exists but work order shows "done" not "inspected"
- Manual status updates to sync states

**Prevention:**
1. **Existing status machine already has `inspected`** - Work order: `done -> inspected -> closed`. Leverage this.
2. **Inspection creates the transition** - Approved inspection auto-transitions work order to `inspected`
3. **Block manual transition** - Can't manually set work order to `inspected` without inspection record
4. **Inspection trigger** - When work order reaches `done`, enable inspection action

**Phase impact:** Phase 3 (Inspection Workflow) - Integration with existing system.

---

## Push Notifications

### Pitfall PN-1: Uploading Separate Service Worker

**What goes wrong:** Push notification tutorials show creating a separate `/push-sw.js` service worker. But PWAs can only have one active service worker per scope. This conflicts with Next.js PWA service worker, causing subscription failures.

**Warning signs:**
- Push subscriptions fail silently
- Service worker registration errors in console
- Notifications work in dev, fail in production
- "Workbox" vs "push" service worker conflicts

**Prevention:**
1. **Merge into single service worker** - Push handling code goes into the same SW that handles caching/offline
2. **Use next-pwa or similar** - Libraries that integrate push into existing SW configuration
3. **Test registration** - Verify only one SW registered at scope `/`
4. **Avoid serwist/workbox conflicts** - If using Workbox for caching, integrate push into Workbox SW

**Phase impact:** Phase 4 (Push Notifications) - Architecture decision before implementation.

---

### Pitfall PN-2: iOS PWA Push Limitations

**What goes wrong:** Push notifications require PWA installation on iOS. If user accesses via Safari bookmark (not "Add to Home Screen"), push doesn't work. And iOS Safari PWA push is relatively new, with quirks.

**Warning signs:**
- "Notifications don't work on my iPhone"
- Works on Android, fails on iOS
- Permission prompt never appears on iOS
- Background notifications not delivered on iOS

**Prevention:**
1. **Require PWA installation for push** - Show "Add to Home Screen" prompt before push subscription
2. **Check platform before showing push UI** - Hide notification options if not supported
3. **Test on iOS 16.4+** - Push for PWAs only works on iOS 16.4 and later
4. **Have fallback** - In-app notification center for critical alerts, push as enhancement
5. **Document requirement** - Tell users: "Install as app to receive notifications"

**Phase impact:** Phase 4 (Push Notifications) - Set correct user expectations.

---

### Pitfall PN-3: VAPID Key Management in Production

**What goes wrong:** VAPID keys generated per developer machine or deployment. Key mismatch between environments breaks all existing subscriptions. Users must re-subscribe after each deployment.

**Warning signs:**
- All push subscriptions stop working after deploy
- "Subscription expired" errors
- Different behavior between staging/production
- Keys stored in `.env.local` but not deployment environment

**Prevention:**
1. **Generate VAPID keys once** - Store permanently in Supabase Vault or deployment secrets
2. **Same keys across all environments** - Or accept that push only works in production
3. **Environment variables** - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` in Vercel environment
4. **Never regenerate** - Regenerating keys invalidates ALL existing subscriptions

**Phase impact:** Phase 4 (Push Notifications) - Infrastructure setup before development.

---

### Pitfall PN-4: Notification Spam and User Control

**What goes wrong:** Sending notifications for every system event. Users get 50 notifications a day, disable all notifications, miss the important ones.

**Warning signs:**
- Users disable notifications entirely
- Complaints about too many alerts
- "I stopped checking notifications because there are so many"

**Prevention:**
1. **Notification preferences** - Let users choose categories (new work order, inspection needed, payment received)
2. **Default to critical only** - Out of the box, only truly urgent notifications
3. **Aggregate non-urgent** - Daily digest for low-priority updates instead of individual pushes
4. **Unsubscribe easy** - One-click disable per category
5. **Start minimal** - v2.2: push only for contractor work order events. Add more later based on feedback.

**Phase impact:** Phase 4 (Push Notifications) - UX design and preferences storage.

---

### Pitfall PN-5: No Notification Center / History

**What goes wrong:** Push notification dismissed by user before they could act on it. No way to see what notifications were received. User misses important update.

**Warning signs:**
- "I got a notification but can't find what it was about"
- Users screenshot notifications before dismissing
- Support requests about missed notifications

**Prevention:**
1. **In-app notification center** - Store all notifications in database, show history in UI
2. **Mark read/unread** - Track which notifications user has seen
3. **Deep link from notification** - Notification click opens relevant page (work order, invoice, etc.)
4. **Keep 30 days** - Retention policy for notification history

**Phase impact:** Phase 4 (Push Notifications) - Include notification center, not just push delivery.

---

### Pitfall PN-6: Contractor Portal Notification Complexity

**What goes wrong:** External contractors access via magic-link (no account). Push notifications require subscription per device, per user. How do you push to a contractor who isn't a "user" in the system?

**Warning signs:**
- Contractors don't receive push notifications
- No way to subscribe anonymous magic-link sessions
- Notification subscription lost when magic-link expires

**Prevention:**
1. **For v2.2, email remains primary for contractors** - Don't push to contractors, email them
2. **Push only for internal users** - KEWA AG users (admin/property_manager) get push
3. **Future: contractor accounts** - If contractor push needed, they need real accounts (Phase 3 consideration)
4. **SMS alternative** - If urgent contractor notification needed, SMS is more reliable than push for non-app users

**Phase impact:** Phase 4 (Push Notifications) - Scope limitation for v2.2.

---

## Knowledge Base

### Pitfall KB-1: Building a Full CMS

**What goes wrong:** Knowledge base scope creeps into full-fledged CMS with versioning, workflows, multiple editors, WYSIWYG editor, media management. Huge effort for FAQ that 2 users will maintain.

**Warning signs:**
- Weeks spent on rich text editor
- Complex permission model for who can edit
- Version history and approval workflows for articles
- Knowledge base becomes project's largest feature

**Prevention:**
1. **Markdown files in repo** - Simplest approach: `/knowledge/*.md` files, rendered at runtime
2. **Static generation** - Build KB pages at deploy time, not dynamic CMS
3. **Single editor** - Only admin can create/edit KB content
4. **No WYSIWYG** - Markdown textarea is sufficient for internal FAQ
5. **Time-box** - Maximum 1 week for knowledge base. If more needed, defer to Phase 3.

**Phase impact:** Phase 5 (Knowledge Base) - Scope control critical.

---

### Pitfall KB-2: No Search Function

**What goes wrong:** 50 FAQ articles created, but no search. Users scroll through categories trying to find relevant info. Abandonment ensues.

**Warning signs:**
- Users ask questions that are in the FAQ
- "I couldn't find it" complaints
- Low FAQ engagement despite good content

**Prevention:**
1. **Full-text search** - Even basic: search article titles and content
2. **Supabase full-text** - Use `tsvector` for PostgreSQL full-text search
3. **Search-first UI** - Prominent search box, categories secondary
4. **Start with search** - Build search before building extensive content

**Phase impact:** Phase 5 (Knowledge Base) - Include search from day one.

---

### Pitfall KB-3: Knowledge Base Disconnected from Workflows

**What goes wrong:** Knowledge base exists as separate "Help" section. Users don't think to check it when stuck. Contextual help not available where needed.

**Warning signs:**
- Low KB traffic despite good content
- Users contact support for documented issues
- "I didn't know there was a help section"

**Prevention:**
1. **Contextual help links** - Work order form has "?" linking to "How to create work order" article
2. **Error-linked articles** - When error occurs, suggest relevant KB article
3. **Empty state guidance** - "No invoices yet. Learn how to add invoices" with KB link
4. **Search from anywhere** - Global command palette or search includes KB results

**Phase impact:** Phase 5 (Knowledge Base) - Design for integration, not standalone.

---

### Pitfall KB-4: Only German Content

**What goes wrong:** Knowledge base written in German, but contractors may prefer other languages. Or future tenant portal users.

**Warning signs:**
- Contractor support requests in other languages
- Can't expand to non-German users

**Prevention:**
1. **For v2.2, German only is fine** - KEWA AG is Swiss German, contractors are local
2. **Design for i18n** - Article has `locale` field even if only `de` used
3. **Separate internal/external KB** - Internal (German) for KEWA AG, external (could be multilingual) for contractors
4. **Don't over-engineer** - Add i18n when there's actual need

**Phase impact:** Phase 5 (Knowledge Base) - Accept limitation for v2.2.

---

## Integration Pitfalls (Adding to Existing System)

### Pitfall INT-1: Breaking Existing Cost Views

**What goes wrong:** New features (change orders, supplier invoices) added without updating the `project_costs` database view. Dashboard shows incomplete/incorrect totals. Discovered weeks later.

**Warning signs:**
- Cost dashboard numbers don't add up
- "Where is this expense?" - not in any view
- Manual reconciliation needed
- Finance team loses trust in system

**Prevention:**
1. **Update views in same migration** - Change order table migration includes updated `project_costs` view
2. **Test aggregations** - Integration tests verify cost totals include all sources
3. **Document cost flow** - Diagram showing all paths to `project_costs`: work_orders -> offers -> invoices, change_orders -> offers -> invoices, purchase_orders -> invoices, expenses
4. **Regression tests** - Existing cost dashboard tests must still pass

**Phase impact:** All phases that touch financials - mandatory integration testing.

---

### Pitfall INT-2: Inconsistent Event/Audit Logging

**What goes wrong:** Existing system has `work_order_events` and `audit_log` tables. New features add their own logging patterns. Some actions logged, some not. Inconsistent actor tracking.

**Warning signs:**
- "Who approved this change order?" - no audit record
- Event types inconsistent (`change_order_created` vs `created_change_order`)
- Some modules use audit_log, others don't
- Actor information missing in some logs

**Prevention:**
1. **Extend existing patterns** - New events follow `work_order_events` pattern (event_type, event_data, actor_type, actor_id)
2. **Create change_order_events** - Same structure as work_order_events
3. **Audit triggers for all tables** - Use existing audit_log trigger pattern for new tables
4. **Event type constants** - Centralize in `/lib/events/constants.ts`

**Phase impact:** All phases - Logging architecture from start.

---

### Pitfall INT-3: State Machine Proliferation

**What goes wrong:** Each new feature adds its own state machine. Change orders, purchase orders, inspections all have different status workflows. No consistency, maintenance burden grows.

**Warning signs:**
- Multiple status validation triggers
- Inconsistent status naming (`approved` vs `accepted` vs `confirmed`)
- Different transition rules per entity
- Hard to understand overall workflow

**Prevention:**
1. **Consistent naming** - If using `approved` for offers, use `approved` for change orders too
2. **Document all machines** - Central STATUS_WORKFLOWS.md documenting all status machines
3. **Shared validation pattern** - All machines use same trigger function structure
4. **Keep machines simple** - Fewer states = fewer bugs. Don't over-engineer.

**Phase impact:** All phases - Design consistency upfront.

---

### Pitfall INT-4: Migration Ordering Dependencies

**What goes wrong:** New migration depends on existing table/enum but migration number is wrong. Or migration modifies existing view that later migration also modifies. Database state becomes inconsistent between environments.

**Warning signs:**
- "Migration failed" errors in CI/CD
- Works in dev, fails in staging (different migration history)
- Supabase migration conflicts
- Manual intervention needed to fix database state

**Prevention:**
1. **Single migration per feature** - Don't split feature across multiple migrations
2. **Test on fresh database** - CI runs all migrations from scratch
3. **Avoid modifying existing views** - Replace instead of alter
4. **Document dependencies** - Migration header comments list prerequisite migrations
5. **Follow existing numbering** - Next migration is 048, then 049, etc.

**Phase impact:** All phases - Migration hygiene critical.

---

### Pitfall INT-5: UI Component Inconsistency

**What goes wrong:** New features use different UI patterns than existing. Change order form looks different from work order form. New status badges use different colors. Users confused.

**Warning signs:**
- "Why does this form look different?"
- Inconsistent button placement
- Different loading/error states
- New components don't follow existing design system

**Prevention:**
1. **Reuse existing components** - Status badges, form layouts, card designs
2. **Extend don't replace** - If new field needed on form, add to existing pattern
3. **Component audit** - Before building new, check if existing component can be adapted
4. **Design review** - New UI compared side-by-side with existing

**Phase impact:** All phases - Design consistency check.

---

### Pitfall INT-6: Adding Service Worker Breaks Existing PWA

**What goes wrong:** Existing PWA has service worker for caching. Adding push notifications modifies service worker, breaks existing caching, users lose offline support.

**Warning signs:**
- "App stopped working offline"
- Cache invalidated unexpectedly
- Service worker update breaks existing sessions
- Push works but caching doesn't (or vice versa)

**Prevention:**
1. **Single service worker** - All functionality in one SW file
2. **Test offline after push changes** - Regression test: existing offline features still work
3. **Incremental SW updates** - Small changes, verify each one
4. **skipWaiting carefully** - Understand implications of forcing SW updates
5. **User notification on update** - "App updated. Refresh to get latest version."

**Phase impact:** Phase 4 (Push Notifications) - Critical integration concern.

---

### Pitfall INT-7: Database Connection Pool Exhaustion

**What goes wrong:** New features add more database queries. Background jobs (notification sending, report generation) use connections. Pool exhausted, main app becomes unresponsive.

**Warning signs:**
- Intermittent "connection timeout" errors
- App slow during batch operations
- Supabase dashboard shows connection limit hits
- Performance degrades over time

**Prevention:**
1. **Use Supabase pooler** - Transaction mode for serverless functions
2. **Close connections** - Ensure all queries close connections properly
3. **Batch operations** - Send notifications in batches, not one query per notification
4. **Monitor pool** - Alert when connections approach limit
5. **Vercel functions** - Use pooled connection string, not direct

**Phase impact:** Phase 4 (Push Notifications) especially - batch sending concern.

---

## Priority Matrix

### Critical (Causes Rewrites or Major Issues)

| Pitfall | Feature | Why Critical |
|---------|---------|--------------|
| CO-1 | Change Orders | Cost tracking broken, fundamental data model |
| CO-4 | Change Orders | State machine conflicts cause workflow breaks |
| INT-1 | All | Financial reporting incorrect, trust lost |
| PN-1 | Push Notifications | Service worker conflicts break PWA entirely |
| PN-3 | Push Notifications | VAPID mismatch invalidates all subscriptions |

### Moderate (Causes Delays or Technical Debt)

| Pitfall | Feature | Impact |
|---------|---------|--------|
| SM-1 | Supplier Module | Need to separate supplier from contractor later |
| IW-1 | Inspection | Can't document findings, disputes unresolvable |
| IW-4 | Inspection | Manual status sync creates data inconsistency |
| INT-2 | All | Inconsistent audit trail, compliance risk |
| INT-6 | Push Notifications | Offline support regression |
| KB-1 | Knowledge Base | Scope creep delays other features |

### Minor (Causes Annoyance but Fixable)

| Pitfall | Feature | Impact |
|---------|---------|--------|
| CO-2 | Change Orders | Bottleneck, but workaround possible |
| SM-3 | Supplier Module | Manual reconciliation needed |
| PN-4 | Push Notifications | User fatigue, disables notifications |
| KB-2 | Knowledge Base | Low adoption, but content still accessible |

---

## Phase-Specific Prevention Summary

### Phase 1: Change Orders
- [ ] Model as work order amendments, not separate entity
- [ ] Update `project_costs` view to include change order amounts
- [ ] Define change order status machine (draft -> pending -> approved/rejected)
- [ ] Block work order inspection if pending change orders exist
- [ ] Require change justification with reason enum
- [ ] Extend existing audit/event logging patterns

### Phase 2: Supplier Module
- [ ] Create `purchase_orders` table (not reuse work_orders)
- [ ] Design inventory tracking schema for future expansion
- [ ] Include delivery confirmation workflow
- [ ] Link supplier invoices to purchase orders
- [ ] Extend cost views to include supplier costs

### Phase 3: Inspection Workflow
- [ ] Create checklist-based inspection (not single pass/fail)
- [ ] Support conditional approval with snag list
- [ ] Integrate with existing work order `done -> inspected` transition
- [ ] Require photos for failed items
- [ ] Store inspector reference

### Phase 4: Push Notifications
- [ ] Generate VAPID keys once, store in production secrets
- [ ] Merge push code into existing service worker
- [ ] Test iOS PWA installation requirement
- [ ] Limit v2.2 push to internal users only
- [ ] Include in-app notification center
- [ ] Define minimal notification categories

### Phase 5: Knowledge Base
- [ ] Time-box to 1 week maximum
- [ ] Use markdown files or simple database, not CMS
- [ ] Include full-text search from start
- [ ] Add contextual help links to existing UI
- [ ] Accept German-only for v2.2

---

## Sources

### Change Orders
- [Procore: How Change Orders Work](https://www.procore.com/library/how-construction-change-orders-work)
- [CMiC: Change Order Workflow Challenges](https://cmicglobal.com/resources/article/erp-solutions-to-common-workflow-challenges-change-orders)
- [Deltek: Managing Change Orders](https://www.deltek.com/en/construction/construction-change-orders)

### Supplier/Inventory
- [Cleveroad: Inventory Management Development](https://www.cleveroad.com/blog/inventory-management-software-development/)
- [Unleashedsoftware: Supply Chain Implementation](https://www.unleashedsoftware.com/blog/how-to-implement-a-supply-chain-management-system/)

### Inspection Workflow
- [Buildertrend: Construction Handover](https://buildertrend.com/blog/construction-project-handover/)
- [Procore: Construction Workflows](https://www.procore.com/library/construction-workflows)

### Push Notifications
- [MagicBell: PWA Push Notifications](https://www.magicbell.com/blog/using-push-notifications-in-pwas)
- [Next.js: PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Re-engageable_Notifications_Push)
- [Designly: Web-Push in Next.js](https://blog.designly.biz/push-notifications-in-next-js-with-web-push-a-provider-free-solution)

### Knowledge Base
- [Scribe: Internal Knowledge Base](https://scribehow.com/library/internal-knowledge-base)
- [KnowledgeOwl: Best Practices](https://www.knowledgeowl.com/blog/posts/find-best-knowledge-base-software)

### System Integration
- [Kanerika: Data Migration Failures](https://medium.com/@kanerika/what-500-enterprise-software-reviews-reveal-about-data-migration-failures-5878a3b6624a)
- [HicronSoftware: Software Migration](https://hicronsoftware.com/blog/software-migration-guide/)
- [Vadimkravcenko: Database Migrations](https://vadimkravcenko.com/shorts/database-migrations/)

---

**Research Confidence Assessment:**

| Area | Confidence | Reason |
|------|------------|--------|
| Change Orders | HIGH | Construction software patterns well-documented, existing codebase analyzed |
| Supplier Module | MEDIUM | General patterns known, Pellets-specific needs unclear |
| Inspection Workflow | HIGH | Standard construction workflow, integrates with existing status machine |
| Push Notifications | HIGH | MDN/Next.js docs verified, iOS limitations confirmed |
| Knowledge Base | MEDIUM | Scope control is main risk, implementation straightforward |
| Integration | HIGH | Based on direct analysis of existing codebase structure |

**Research Date:** 2026-01-25
**Valid Until:** 2026-04-25 (3 months - Push API landscape may evolve)
