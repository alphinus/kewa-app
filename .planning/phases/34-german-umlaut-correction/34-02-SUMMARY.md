# Plan 34-02 Summary: Umlaut Corrections

**Status:** Complete
**Duration:** ~15 min
**Date:** 2026-02-17

## What was done

1. **Batch umlaut correction** — Created and ran a dictionary-based replacement script that:
   - Applied 664 replacements across 198 source files
   - Used longest-match-first ordering to handle compound words correctly
   - Preserved URL paths (`/dashboard/aenderungsauftraege/`) unchanged
   - Preserved function/variable names (`AenderungsauftragDetailPage`) unchanged
   - Applied NFC Unicode normalization to all modified files

2. **Database migration** — Created `supabase/migrations/072_fix_german_umlauts.sql` to fix German text in:
   - Unit names ("Gesamtes Gebäude")
   - Project names/descriptions (Küche, Rückbau)
   - Template names/descriptions/tasks
   - Quality gate checklists (JSONB)
   - Ticket messages and descriptions
   - Table comments

## Verification results

- `grep` for ae/oe/ue patterns returns only URL paths and function names (0 UI strings)
- `npm run type-check` passes
- `npm run build` succeeds (115 routes, all compile)
- `npm run verify:encoding` → 625/625 files valid

## Key replacements by frequency

| Pattern | Count | Example |
|---------|-------|---------|
| für (was fuer) | ~90 | "für schnelleren Zugriff" |
| Gebäude (was Gebaeude) | ~40 | "Gebäudeübersicht" |
| Übersicht (was Uebersicht) | ~25 | "Liegenschaftsübersicht" |
| Prüfung (was Pruefung) | ~30 | "In Prüfung", "Rechnungsprüfung" |
| Räume (was Raeume) | ~20 | "Keine Räume vorhanden" |
| löschen (was loeschen) | ~20 | "Aufgabe löschen?" |
| hinzufügen (was hinzufuegen) | ~15 | "Gebäude hinzufügen" |
| Küche (was Kueche) | ~15 | "Waschküche" |
| zurück (was zurueck) | ~12 | "Zurück zur Übersicht" |
| wählen (was waehlen) | ~10 | "Gebäude wählen" |

## Files preserved (not modified)

- URL route segments: `/dashboard/aenderungsauftraege/` (Next.js file-system routing)
- Function names: `AenderungsauftragDetailPage`, `AuftraegePage`, etc.
- Already-applied migration files (072 created as new migration)
- English words containing ae/oe/ue (no false positives)

## Notes

- Temporary `scripts/fix-umlauts.ts` was removed after execution
- SQL migration 072 handles database records with stale German text
- Combined/dump SQL files still contain old text (regenerate from migrations if needed)
