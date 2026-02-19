# Phase 35 Context: Schema Foundation

**Created:** 2026-02-18
**Phase:** 35 — Schema Foundation
**Source:** discuss-phase session

## Decisions (LOCKED — implement exactly)

### D1: Naming Convention — English Throughout
All new table names, column names, enum values in English. Consistent with existing schema (properties, buildings, units, tasks). German terms only in UI labels, never in schema.

Examples: `organizations`, `owners`, `mandates`, `tenancies`, `ownership_fraction` (not `wertquote`), `renewal_fund_balance` (not `erneuerungsfonds_balance`).

### D2: Tenant vs Global Table Classification
| Category | Tables | organization_id? |
|----------|--------|-------------------|
| **Per-Organization** | properties, buildings, units, rooms, projects, tasks, work_orders, offers, invoices, expenses, payments, media, audit_logs, partners, knowledge_articles, inspections, change_orders, push_subscriptions, notification_preferences, suppliers, purchase_orders, tickets, comments, parking_spaces (→ becomes units), tenancies, mandates, owners | YES |
| **Global (no org_id)** | roles, permissions, system_settings | NO |
| **Global + Org Extension** | trade_types, quality_gate_definitions — system provides base set, orgs can add custom entries but cannot modify global ones | org_id NULLABLE (NULL = system, UUID = org-specific) |
| **Global + Org Override** | project_templates, wbs_templates — system templates global, orgs can copy and customize | org_id NULLABLE (NULL = system template, UUID = org copy) |

Special cases:
- **Knowledge Base articles:** Per-organization (private internal docs)
- **Audit logs:** Per-organization with org_id, future super-admin view sees all
- **Push notification preferences:** Per user+organization (user can mute per org)
- **Suppliers/Lieferanten:** Per-organization (no sharing between orgs)
- **Tenant portal tickets:** Strictly org-isolated via unit hierarchy

### D3: Mandate-Property Relationship — 1:N with Temporal Mandates
- **1 Owner = N Mandates** (Owner can have multiple management contracts)
- **1 Mandate = N Properties** (properties.mandate_id FK)
- **Mandate has start_date / end_date** — temporal, not permanent assignment
- **Mandate switch:** Old mandate gets end_date, new mandate created, property.mandate_id updated
- **Historical data stays with old mandate** for legal/accounting purposes
- **STWE-Gemeinschaft** is the owner entity for condominium mandates
- **Individual STWE unit owners can also have own mandates** (Sonderverwaltungsmandat — rare but possible)

### D4: Owner Model — Full Entity with Contact Data
Owner is a first-class entity, separate from users:
- **owner_type enum:** `person`, `company`, `community` (Erbengemeinschaft), `stwe_association`
- **Contact fields:** name, address, postal_code, city, country, phone, email, language
- **Optional user_id FK:** nullable, links to auth user for future owner portal login
- **Not a user by default** — owner is business/legal entity, user is system account

### D5: Organization Legal Fields
Organizations get Swiss legal/business fields:
- `uid` (Unternehmens-Identifikationsnummer, CHE-xxx.xxx.xxx)
- `vat_number` (MwSt-Nummer)
- `commercial_register` (Handelsregister-Eintrag)
- `bank_account` (IBAN for invoicing)
- All nullable — filled when org needs official documents

### D6: STWE Owner FK Prepared Now
- `units.stwe_owner_id` → `owners(id)` as nullable FK
- Schema ready for STWE unit-owner assignment, UI comes later
- properties.property_type discriminator: `rental` | `stwe`

### D7: Parking Spaces Become Units
- Migrate `parking_spaces` table content into `units` with `unit_type = 'parking'`
- Existing unit_type values: extend to include `parking`, `garage`, `storage`
- Tenancy model works uniformly on all unit types
- External parkers (no apartment) get a tenancy on the parking unit — they are full tenants with a contract

### D8: Swiss Tenancy Law Fields
Tenancies table gets Swiss rental law fields (all nullable for flexibility):
- `base_rent` (Nettomiete)
- `ancillary_costs` (Nebenkosten-Akonto, OR 257a)
- `deposit_amount` (Mietkaution, max 3 Monatsmieten per OR 257e)
- `notice_period_months` (Kündigungsfrist)
- `reference_interest_rate` (Referenzzinssatz for rent adjustments)
- `contract_type` enum: `residential`, `commercial`, `parking`, `storage`

### D9: Grundbuch Reference on Properties
Properties get Swiss land registry fields (nullable):
- `land_registry_nr` (Grundbuchnummer)
- `municipality` (Gemeinde)
- `parcel_nr` (Parzellennummer)

### D10: KEWA AG Seed Strategy
- KEWA AG is the first customer, not the product itself
- Seed as organization with full legal fields
- Create one default mandate initially, split into real mandates later
- All existing data backfilled to KEWA AG org (Phase 36 handles this)

### D11: International Extensibility (Architecture Principle)
- Schema designed for Swiss law first (OR, Mietrecht, Grundbuch)
- Country-specific fields are nullable and clearly named
- No hardcoded Swiss-only logic in schema — country-specific behavior lives in application layer
- Future: `organizations.country` field to drive jurisdiction-specific logic
- This is an architecture principle, NOT a Phase 35 deliverable beyond nullable fields

## Claude's Discretion (implementation freedom)

### Technical Decisions
- Exact list of which existing tables get organization_id (audit the ~68 tables, determine actual count)
- Index naming conventions (idx_tablename_column pattern)
- Trigger implementation details for org_id sync
- Migration file numbering (continue from existing sequence)
- Whether to use CHECK constraints or triggers for cross-tenant FK validation
- How to handle the parking_spaces → units migration (data + FK updates)
- Enum type definitions (CREATE TYPE vs text with CHECK)

### Schema Details
- Exact column ordering in new tables
- Default values for enums
- Whether mandate_type uses enum or text
- Composite index choices (which columns to combine)
- Which FKs get ON DELETE CASCADE vs NO ACTION vs SET NULL

## Deferred Ideas (out of scope for Phase 35)

- **Owner Portal login** — user_id FK prepared, actual auth flow deferred to future milestone
- **STWE UI** — fields prepared, forms/views deferred
- **Multi-language** — schema extensible, i18n framework deferred
- **Integrated accounting** — legal fields prepared, GL deferred
- **Custom roles per org** — global roles sufficient for now
- **Nebenkosten-Abrechnung UI** — fields on tenancy, calculation logic deferred
- **Grundbuch API integration** — fields prepared, external API deferred
- **Treuhänder as second customer** — org model supports it, onboarding flow deferred

---
*Phase 35 context captured from discuss-phase session, 2026-02-18*
