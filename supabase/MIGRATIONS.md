# KEWA Database Migrations

Documentation for all database migrations in the KEWA Renovations Operations System.

## Quick Reference

| Migration | Name | Purpose |
|-----------|------|---------|
| 001 | initial_schema | Core tables: users, buildings, units, projects, tasks |
| 002 | set_pin_hashes | Set initial PIN hashes for users |
| 003 | task_photos | Task photo attachments |
| 004 | disable_rls | Disable RLS (dev only) |
| 004 | storage_buckets | Supabase storage configuration |
| 005 | task_audio | Audio recording attachments |
| 006 | archive_tracking | Soft delete/archive functionality |
| 007 | test_data | Development test data |
| 008 | property_building | Property entity, building enhancement |
| 009 | unit_room | Room entity with types and conditions |
| 010 | component | Building component tracking |
| 011 | renovation_project | Structured renovation projects |
| 012 | task_enhancements | Enhanced task fields |
| 013 | work_order | External contractor work orders |
| 014 | partner | Partners (contractors/suppliers) |
| 015 | media | Unified media management |
| 016 | audit_log | Audit trail logging |
| 017 | offer | Cost offers/quotes |
| 018 | invoice | Partner invoices |
| 019 | expense | Direct expenses |
| 020 | payment | Payment tracking |
| 021 | cost_views | Cost aggregation views |
| 022 | rbac | Role-Based Access Control |
| 023 | users_auth | Enhanced user authentication |
| 024 | magic_links | Contractor magic link auth |
| 025 | work_order_status | Work order status workflow |
| 026 | project_status | Project status workflow |
| 027 | condition_tracking | Digital Twin condition tracking |
| 028 | audit_triggers | Automatic audit logging triggers |
| 029 | rls_policies | Row Level Security policies |
| 030 | retention | Data retention policies |
| 031 | storage_buckets | Extended storage configuration |
| 032 | templates | WBS template structure |
| 033 | template_triggers | Template calculation triggers |
| 034 | seed_templates | Seed template data |
| 035 | project_from_template | Template-to-project instantiation |
| 036 | task_dependencies_extended | Extended dependency types |
| 037 | work_order_extensions | Work order enhancements |
| 038 | work_order_events | Work order event logging |
| 039 | parking_spots | Parking unit type |
| 040 | comments | General commenting system |
| 044 | buildings_rls | Building-level RLS |
| 045 | seed_partners_workorders | Test partners and work orders |
| 046 | fix_work_order_event_trigger | Fix enum cast in trigger |
| 047 | seed_complete_workflow | Complete workflow test data |

## Running Migrations

### Local Development

```bash
# Apply all migrations to local database
supabase db push

# Reset database (drops and recreates)
supabase db reset
```

### Production

```bash
# Generate migration diff
supabase db diff

# Apply pending migrations
supabase migration up
```

## Schema Overview

### Core Hierarchy

```
properties
  └── buildings
        └── units (apartment | common_area | building | parking)
              └── rooms (with condition tracking)
                    └── projects
                          └── tasks
```

### Work Order Flow

```
partners (contractor | supplier)
  └── work_orders (draft → sent → viewed → accepted → in_progress → done → inspected → closed)
        ├── work_order_events (audit trail)
        └── invoices
```

### Template System (WBS)

```
templates
  └── template_phases (Level 1)
        └── template_packages (Level 2)
              └── template_tasks (Level 3)
                    └── template_dependencies
        └── template_quality_gates
```

### Cost Module

```
renovation_projects
  ├── invoices (from partners)
  ├── expenses (direct costs)
  └── payments

cost_views aggregate all cost data
```

## Detailed Migration Documentation

### 001_initial_schema.sql

Creates the foundational schema:

**Tables:**
- `users` - PIN-authenticated users (kewa, imeri roles)
- `buildings` - Property buildings
- `units` - Apartments and common areas
- `projects` - Work projects within units
- `tasks` - Individual tasks with priority and due dates

**Indexes:** On foreign keys and common query patterns

**Seed data:** Initial users, one building, 13 apartments, 9 common areas

---

### 008_property_building.sql

Introduces property entity for multi-building management:

**Tables created:**
- `properties` - Top-level property entity

**Columns added:**
- `buildings.property_id` - Link to parent property
- `buildings.updated_at` - Modification timestamp

**Triggers:** `update_updated_at()` function for timestamp management

---

### 009_unit_room.sql

Adds room-level granularity for Digital Twin:

**Types created:**
- `room_type` - bathroom, kitchen, bedroom, living_room, hallway, balcony, storage, laundry, garage, office, other
- `room_condition` - old, partial, new

**Tables created:**
- `rooms` - Individual rooms within units with condition tracking

**Columns added:**
- `units.rent_amount` - Monthly rent
- `units.rent_currency` - Currency (default CHF)

---

### 013_work_order.sql

External contractor assignment system:

**Types created:**
- `work_order_status` - draft, sent, viewed, accepted, rejected, in_progress, done, inspected, closed

**Tables created:**
- `work_orders` - Complete work order workflow with:
  - Scheduling (requested, proposed, actual dates)
  - Magic link access tokens
  - Cost tracking (estimated, proposed, final)
  - Internal and contractor notes

---

### 014_partner.sql

Partner (contractor/supplier) management:

**Types created:**
- `partner_type` - contractor, supplier
- `trade_category` - general, plumbing, electrical, hvac, painting, flooring, carpentry, roofing, masonry, glazing, landscaping, cleaning, demolition, other

**Tables created:**
- `partners` - Company info, contact details, trade specializations

---

### 022_rbac.sql

Role-Based Access Control:

**Types created:**
- `user_role` - admin, property_manager, accounting, tenant, external_contractor
- `auth_method` - pin, email_password, magic_link

**Tables created:**
- `roles` - System roles with internal access flag
- `permissions` - Granular resource:action permissions
- `role_permissions` - Junction table

**Seeded permissions:** Full CRUD on properties, units, projects, tasks, work_orders, partners, costs, reports, users, tenants, tickets, audit, settings

---

### 032_templates.sql

WBS template hierarchy:

**Types created:**
- `template_category` - complete_renovation, room_specific, trade_specific
- `template_scope` - unit, room
- `dependency_type` - FS, SS, FF, SF
- `gate_level` - package, phase

**Tables created:**
- `templates` - Root template with category and scope
- `template_phases` - WBS Level 1
- `template_packages` - WBS Level 2 with trade association
- `template_tasks` - WBS Level 3 with materials and checklists
- `template_dependencies` - Task-to-task dependencies
- `template_quality_gates` - Checkpoints with evidence requirements

---

### 045_seed_partners_workorders.sql

Test data for contractor portal:

**Seeded data:**
- 3 test partners (plumber, electrician, multi-trade)
- 3 test work orders in various states (sent, draft, viewed)

---

### 046_fix_work_order_event_trigger.sql

Bug fix for work order event logging:

**Fixed functions:**
- `log_work_order_created()` - Proper enum cast for actor_type
- `log_work_order_status_change()` - Proper enum cast for actor_type

---

### 047_seed_complete_workflow.sql

Comprehensive test data for all modules:

**Seeded data:**
- Second property (Neubau Zurich West)
- Rooms for 5 units with varying conditions
- Active renovation project
- Additional work orders (in_progress, completed)
- 5 expenses across different categories
- 3 invoices (paid, under_review, approved)
- 6 condition history entries

## Notes

- Migrations are numbered sequentially
- Gap at 041-043 is intentional (reserved for future use)
- All tables use UUID primary keys via `gen_random_uuid()` or `uuid_generate_v4()`
- All tables include `created_at` and most include `updated_at`
- RLS policies in 029 secure data access by role
