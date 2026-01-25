# 17-04 Summary: Demo Data Seed Script

## Status: COMPLETE

## Changes Made

### Task 1-3: Comprehensive Seed Script
Created `supabase/seed_demo_data.sql` with Swiss-realistic demo data.

**Data created:**

| Entity | Count | Details |
|--------|-------|---------|
| Properties | 5 | Zürich (3), Bern (2) with realistic addresses |
| Buildings | 16 | 2-4 per property, Swiss naming conventions |
| Units | 10 | Sample apartments for project testing |
| Partners | 22 | 15 contractors, 7 suppliers, 2 inactive |
| Templates | 5 | Vollrenovation, Bad, Küche, Maler, Boden |
| Projects | 12 | Varied statuses for dashboard testing |

**Project status distribution:**
- 3 active healthy (recent updates, future deadlines)
- 2 overdue (deadline passed, still active)
- 2 stalled (no updates for 10+ days)
- 3 completed (for history/timeline)
- 1 blocked (Asbestfund scenario)
- 1 planned (future Q2 2026)

**Script features:**
- Idempotent: `IF EXISTS` check prevents duplicates
- Fixed UUIDs: Referential integrity maintained
- NOW()-relative dates: Fresh data on each run
- Swiss names: Realistic company and person names
- Header comments: Cleanup instructions included

## Commits

| Hash | Message |
|------|---------|
| 1256fcc | feat(17-04): add Swiss-realistic demo data seed script |

## Artifacts

| File | Lines | Purpose |
|------|-------|---------|
| supabase/seed_demo_data.sql | 517 | Idempotent demo data seed script |

## Verification

- [x] supabase/seed_demo_data.sql exists
- [x] Script uses IF NOT EXISTS pattern (idempotent)
- [x] Contains 5+ Swiss properties with addresses
- [x] Contains 15+ buildings across properties
- [x] Contains 20+ partners (contractors and suppliers)
- [x] Contains 10+ projects with varied statuses
- [x] Includes overdue and stalled projects for alerts
- [x] Fixed UUIDs used for referential integrity
- [x] Cleanup instructions in header comments

## Success Criteria Met

- SEED-02: Demo data script creates realistic test data for development/testing
