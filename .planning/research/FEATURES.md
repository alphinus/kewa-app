# Feature Research: Multi-Tenant Property Management

**Domain:** Swiss Property Management SaaS (Multi-Tenant)
**Researched:** 2026-02-18
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Organization/Verwaltung Switcher | Standard SaaS pattern - users manage multiple mandates/clients | MEDIUM | Dropdown in header with search, recent items. Token-based tenant isolation. See Clerk, WorkOS patterns. |
| Mandate (Mandat) Management | Core Swiss property mgmt concept - each mandate = distinct client/property portfolio | MEDIUM | Verwaltungsmandat is legal contract (Swiss Code of Obligations). Track mandate dates, scope, billing terms. |
| Property Hierarchy Navigation | Users expect: Verwaltung → Mandat → Eigentümer → Liegenschaft → Gebäude → Einheit → Mietverhältnis | HIGH | Current confusion: "Liegenschaft" vs "Gebäude" used interchangeably. Fix: Liegenschaft = property parcel, Gebäude = building structure. Breadcrumbs + drilldown menus essential. |
| Role-Based Owner vs Manager Views | Owners see limited financial/strategic data; managers see operations | MEDIUM | Owner portal: occupancy, rental income, high-level maintenance. Manager: full CRUD, detailed workflows. Row-level security required. |
| STWE (Stockwerkeigentum) Fields | Condominium ownership is common in Switzerland - unit owners, special assessments, voting | HIGH | Already prepared in data model (good!). Need: unit owner list, ownership %, assembly minutes, special assessment tracking, individual unit cost allocation. |
| Multi-Property Dashboard | Mandate-level view aggregating all properties under that mandate | MEDIUM | Heatmap, occupancy %, cost rollup. Already exists at property level - extend to mandate level. |
| Property → Building Drill-Down | Properties contain multiple buildings (Swiss context: large estates/complexes) | LOW | Fix terminology confusion first. Gebäude subordinate to Liegenschaft. |
| Owner Financial Reporting | Separate P&L per Eigentümer, especially for STWE where each unit owner needs statements | MEDIUM | Swiss law requires transparent condominium accounting. Auto-generate owner statements quarterly/annually. |
| Mandate-Scoped Data Isolation | All data (projects, tasks, invoices, media) scoped to mandate - zero leakage | HIGH | Critical for SaaS. tenant_id on every table. Middleware enforcement. Supabase RLS already in place - extend to mandate_id. |
| Organization User Invites | Invite team members to specific mandates with role assignment | MEDIUM | Standard SaaS. Email invite, role picker, mandate assignment. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unified Renovation + STWE in One Platform | Competitors separate STWE admin from project management (Rimo R5, ImmoTop2, GARAIO REM focus on accounting; project tools are separate) | LOW | Already have renovation system built. Adding STWE layer = competitive edge. Market gap. |
| Owner Self-Service Portal with Live Updates | Most Swiss tools generate static reports - live dashboard rare | MEDIUM | Owners login, see real-time renovation status, costs, unit conditions. Builds on existing digital twin. Reduces "status update" emails. |
| Automatic Unit Condition Tracking (Digital Twin) | Few competitors auto-derive unit state from completed work | LOW | Already built (HIST-01 to HIST-05). Extend to STWE context: show which unit owners have which renovations done. |
| Cross-Mandate Portfolio View | Manage multiple mandates in single pane - competitors often silo per mandate | MEDIUM | Dashboard showing all mandates with KPIs: total units, occupancy %, active projects. Switcher for drill-down. |
| Transparent External Contractor Integration | Magic-link portal is simpler than forcing contractors into "another login" | LOW | Already built (EXT-01 to EXT-16). Competitors require contractor accounts or email-only workflows. |
| Flexible Property Hierarchy | Support both single-building and complex multi-building estates without forcing structure | MEDIUM | Gebäude optional under Liegenschaft. Competitors force one model. Swiss market has both (single villa vs large complex). |
| Mobile-First Owner Portal | Owners check status on phone - most Swiss tools desktop-only | LOW | PWA already built. Extend owner view. |
| Multi-Language Support (German, French, Italian) | Swiss market requirement - Fairwalter, Rimo R5 offer this | MEDIUM | Currently German-only. Add i18n for CH-FR, CH-IT. Umlaut handling already fixed (Phase 34). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Global Search Across All Mandates | "Find anything fast" | Privacy violation - user shouldn't see data from mandates they don't access. Mandate switching is intentional context boundary. | Mandate-scoped search only. Fuzzy search within active mandate context. |
| Automatic Mandate Switching Based on URL | "Deep links should auto-switch" | Confusing - user clicks link, suddenly in different mandate without realizing. Security risk. | Interstitial: "This link is for Mandate X. Switch to view?" |
| Owner-Editable Project Data | "Empower owners to update directly" | Breaks audit trail. Owners lack context for internal workflows. Creates version conflicts. | Owner comments/questions only. Manager updates data, owner sees live read-only view. |
| Flat "All Properties" List | "Simpler than hierarchy" | Doesn't match Swiss legal structure. Mandates are distinct legal entities. Mixing = accounting/compliance nightmare. | Always mandate-scoped. Clear hierarchy enforced. |
| Shared Templates Across Mandates | "Reuse work order templates everywhere" | Template customization per mandate is common (different contractors, standards, pricing). Shared = version chaos. | Templates library per mandate. Option to copy template to another mandate (not share). |
| Real-Time Collaboration (Google Docs style) | "Multiple users editing same record" | Low ROI for property mgmt use case. Rare that 2+ users edit same task simultaneously. Adds conflict resolution complexity. | Optimistic locking with "last save wins" warning. Audit log shows who changed what. |

## Feature Dependencies

```
[Organization/Verwaltung Switcher]
    └──requires──> [Mandate-Scoped Data Isolation]
                       └──requires──> [Role-Based Permissions per Mandate]

[STWE Features]
    └──requires──> [Property Hierarchy (Liegenschaft → Gebäude → Einheit)]
    └──requires──> [Owner Financial Reporting]
    └──enhances──> [Unit Condition Tracking] (show per owner)

[Cross-Mandate Portfolio View]
    └──requires──> [Organization/Verwaltung Switcher]
    └──requires──> [Multi-Property Dashboard]

[Owner Self-Service Portal]
    └──requires──> [Role-Based Owner vs Manager Views]
    └──requires──> [Owner Financial Reporting]
    └──enhances──> [Digital Twin/Unit Condition Tracking]

[Multi-Language Support]
    └──enhances──> [Owner Portal] (required for Romandie, Ticino)
    └──conflicts──> [AI Voice Transcription] (already out-of-scope for Swiss-German dialect)

[Property → Building Drill-Down]
    └──requires──> [Terminology Fix: Liegenschaft vs Gebäude]
```

### Dependency Notes

- **Organization Switcher requires Mandate-Scoped Data Isolation:** Cannot switch contexts if data isn't properly isolated. Security-critical dependency.
- **STWE requires Property Hierarchy:** Condominium ownership is unit-level. Must have Liegenschaft → Gebäude → Einheit structure clear.
- **Owner Portal enhances Digital Twin:** Existing unit condition tracking becomes powerful when owners can see their units live.
- **Multi-Language conflicts with Dialect Transcription:** Already decided against Swiss-German voice-to-text (v2.0 REQUIREMENTS.md line 196). Don't add standard German if expectation is dialect support.

## MVP Definition (v3.0 Multi-Tenant Foundation)

### Launch With (v3.0)

Minimum viable SaaS multi-tenant product — what's needed to support multiple clients/mandates.

- [x] **Organization/Verwaltung Switcher** — Cannot be multi-tenant without it. Blocks all mandate features.
- [x] **Mandate Management (CRUD)** — Create, archive mandates. Assign properties to mandates.
- [x] **Mandate-Scoped Data Isolation** — Security fundamental. All existing data (projects, tasks, invoices) scoped to mandate.
- [x] **Property Hierarchy Terminology Fix** — Clarify Liegenschaft (property parcel) vs Gebäude (building). Fix UI labels, schema comments.
- [x] **Role-Based Permissions per Mandate** — User can be admin in Mandate A, viewer in Mandate B.
- [ ] **Navigation Redesign** — Breadcrumbs: Verwaltung → Mandat → Liegenschaft → Gebäude → Einheit. Remove footer redundancy.
- [ ] **STWE Basic Fields (UI)** — Expose existing STWE fields: unit owner name, ownership %, special assessments. No voting/assembly features yet.

### Add After Validation (v3.1)

Features to add once core multi-tenant is working and validated with 2-3 mandates.

- [ ] **Cross-Mandate Portfolio Dashboard** — Aggregate view for users managing multiple mandates. Useful once >3 mandates.
- [ ] **Owner Self-Service Portal** — Owners login, see their units/costs read-only. Validation trigger: KEWA has owners asking "what's the status?"
- [ ] **Organization User Invites** — Invite colleagues to specific mandates. Needed when KEWA hires second property manager.
- [ ] **Mandate-Level Templates** — Copy template libraries per mandate (not shared). Trigger: KEWA managing mandates with different contractors.
- [ ] **Owner Financial Reporting (Basic)** — Auto-generate PDF statement per owner: costs incurred, unit condition. Trigger: first STWE property.

### Future Consideration (v3.2+)

Features to defer until product-market fit with multiple clients.

- [ ] **Multi-Language (French, Italian)** — Required for Romandie/Ticino expansion. Not needed for initial Zurich-area mandates. Trigger: first French-speaking client.
- [ ] **STWE Advanced (Voting, Assemblies)** — Assembly minutes, vote tracking, quorum. Complex, low ROI until managing multiple STWE properties. Trigger: >5 STWE properties.
- [ ] **Mobile Owner App (Native)** — PWA sufficient for now. Native app = higher perceived legitimacy but 3x dev cost. Trigger: owner feedback "PWA feels wrong."
- [ ] **Advanced RBAC (Custom Roles)** — Current roles (admin, manager, accounting, tenant, contractor) sufficient. Custom roles = complexity. Trigger: client needs unusual permission combo.
- [ ] **Audit Log Viewer (UI)** — Logs exist (NFR-01), no UI to browse. Trigger: compliance audit or dispute requiring timeline reconstruction.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| Mandate-Scoped Data Isolation | HIGH | HIGH | P1 | - |
| Organization/Verwaltung Switcher | HIGH | MEDIUM | P1 | Data Isolation |
| Mandate Management (CRUD) | HIGH | LOW | P1 | - |
| Property Hierarchy Terminology Fix | HIGH | LOW | P1 | - |
| Role-Based Permissions per Mandate | HIGH | MEDIUM | P1 | Data Isolation |
| Navigation Redesign (Breadcrumbs) | MEDIUM | MEDIUM | P1 | Terminology Fix |
| STWE Basic Fields (UI) | MEDIUM | LOW | P1 | Property Hierarchy |
| Cross-Mandate Portfolio Dashboard | MEDIUM | MEDIUM | P2 | Mandate Switcher |
| Owner Self-Service Portal | HIGH | MEDIUM | P2 | RBAC, STWE |
| Organization User Invites | MEDIUM | MEDIUM | P2 | RBAC |
| Mandate-Level Templates | LOW | LOW | P2 | Mandate CRUD |
| Owner Financial Reporting (Basic) | MEDIUM | MEDIUM | P2 | STWE, Owner Portal |
| Multi-Language (FR, IT) | MEDIUM | HIGH | P3 | i18n framework |
| STWE Advanced (Voting) | LOW | HIGH | P3 | STWE Basic |
| Mobile Owner App (Native) | LOW | HIGH | P3 | Owner Portal |
| Custom Roles (Advanced RBAC) | LOW | HIGH | P3 | RBAC |
| Audit Log Viewer (UI) | LOW | LOW | P3 | - |

**Priority key:**
- P1: Must have for v3.0 launch (multi-tenant foundation)
- P2: Should have for v3.1 (validation/polish)
- P3: Nice to have for v3.2+ (future consideration)

## Competitor Feature Analysis

| Feature | Fairwalter | Rimo R5 / ImmoTop2 | GARAIO REM | KeWa Approach |
|---------|------------|-------------------|------------|---------------|
| Multi-Tenant Architecture | Yes (SaaS, per-client instances implied) | Yes (enterprise, flexible deployment) | Yes (online help, multi-property) | Yes - mandate = tenant boundary |
| Mandate Management | Property master data sync via API | Integrated ecosystem, comprehensive mgmt tasks | Condominium ownership support | Verwaltungsmandat = first-class entity |
| Property Hierarchy | Centralized property/lease management | Not detailed in sources | Not detailed in sources | Verwaltung → Mandat → Eigentümer → Liegenschaft → Gebäude → Einheit |
| STWE Support | Not mentioned | ImmoTop2: integrated accounting for STWE | Comprehensive functions for STWE | Fields exist, need UI for unit owners, special assessments |
| Owner Portal | Not mentioned | Not mentioned | Not mentioned | **Differentiator:** Live read-only dashboard for owners |
| Renovation/Project Mgmt | Inventory tracking (condition/repairs) | Not primary focus (accounting-centric) | Not mentioned | **Differentiator:** Full renovation ops integrated with STWE |
| External Contractor Integration | Assign tasks to service providers | Not detailed | Not mentioned | **Differentiator:** Magic-link portal, no login required |
| Financial Reporting | Automated debtor/creditor, chart of accounts | Integrated accounting | Not detailed | CSV export (current), owner statements (planned P2) |
| Document Management | AI-powered tagging, search | Digital storage, automated workflows | Instructional videos, help center | Media entity, audit log (current) |
| Mobile Support | Not mentioned | Not mentioned | Not mentioned | **Differentiator:** PWA with offline sync |

**Our Competitive Position:**
- **Strength:** Renovation operations + STWE in one platform (competitors separate these)
- **Strength:** External contractor magic-link portal (simpler than forced logins)
- **Strength:** Digital twin / auto condition tracking
- **Gap:** Multi-language (competitors serve all CH language regions)
- **Gap:** Integrated accounting (we export CSV; they have full GL)
- **Parity:** Multi-tenant, mandate management, property hierarchy

## Sources

**SaaS Multi-Tenancy & UI Patterns:**
- [Multi-Tenant Architecture - SaaS App Design Best Practices](https://relevant.software/blog/multi-tenant-architecture/)
- [SaaS and Multitenant Solution Architecture - Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/saas-multitenant-solution-architecture/)
- [Building Multi-Tenant Apps Using Clerk's Organization - ZenStack](https://zenstack.dev/blog/clerk-multitenancy)
- [Designing a layout structure for SaaS products - Medium](https://medium.com/design-bootcamp/designing-a-layout-structure-for-saas-products-best-practices-d370211fb0d1)

**Swiss Property Management:**
- [Immobiliensoftware Schweiz – ImmoTop2, Rimo R5 & Fairwalter](https://www.wwimmo.ch/produkte/)
- [5 Immobilien ERP-Systeme, die Sie kennen sollten - emonitor](https://emonitor.ch/5-immobilien-erp-systeme-die-sie-kennen-sollten/)
- [The property management contract (rental management) - Esther Lauber](https://www.esther-lauber.ch/index.php/en/leases-for-flats/39-useful-information-on-real-estate-in-geneva/253-the-property-management-contract-rental-management)

**STWE (Stockwerkeigentum):**
- [Neowise / Verwaltung von Stockwerkeigentum](https://neowise.ch/einblicke/news/verwaltung-von-stockwerkeigentum-entdecken-sie-die-neue-funktion/)
- [Special Assessments in Florida Condominium Associations - Ferrer Law Group](https://www.ferrerlawgroup.com/special-assessments-in-florida-condominium-associations-legal-requirements-and-owner-challenges/)
- [HOA Special Assessment Rules - Community Associations Law](https://communityassociations.law/article/budgets-reserves-and-the-ohio-requirement-for-an-annual-ownership-vote-if-reserve-funding-is-to-be-waived-the-special-assessment-problem/)

**Navigation & UX:**
- [Navigation UX: Pattern Types and Tips - Userpilot](https://userpilot.com/blog/navigation-ux/)
- [PatternFly Navigation Design Guidelines](https://www.patternfly.org/components/navigation/design-guidelines/)
- [Hierarchy drill-down – amCharts 5](https://www.amcharts.com/docs/v5/charts/hierarchy/hierarchy-drill-down/)
- [Feature Update | New Breadcrumb Options - Rentec Direct](https://www.rentecdirect.com/blog/feature-update-breadcrumb-options/)

**Owner vs Manager Views:**
- [Hostfully - Owner Portal](https://www.hostfully.com/pmp-features/owner-portal/)
- [Top Property Management Dashboards for 2025 - Second Nature](https://www.secondnature.com/blog/property-management-dashboard)
- [Property Management Dashboard Power BI - Global Data 365](https://globaldata365.com/property-management-dashboard/)

---
*Feature research for: KeWa App v3.0 Multi-Tenant Property Management*
*Researched: 2026-02-18*
*Confidence: MEDIUM (verified with multiple sources, some Swiss-specific details from general context)*
