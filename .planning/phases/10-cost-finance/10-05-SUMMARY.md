---
phase: 10
plan: 05
subsystem: cost-export
tags: [csv, export, accounting, swiss-formatting, papaparse]
dependencies:
  requires: [10-01, 10-02]
  provides: [cost-csv-export, accounting-integration]
  affects: []
tech-stack:
  added: [papaparse]
  patterns: [swiss-csv-formatting, utf8-bom-excel]
key-files:
  created:
    - src/lib/costs/csv-export.ts
    - src/app/api/costs/export/route.ts
    - src/components/costs/ExportModal.tsx
    - src/components/costs/ExportButton.tsx
    - src/app/dashboard/kosten/export/page.tsx
    - src/app/dashboard/kosten/export/ExportForm.tsx
  modified:
    - package.json
    - src/app/dashboard/kosten/rechnungen/page.tsx
    - src/app/dashboard/kosten/ausgaben/page.tsx
decisions:
  - id: swiss-csv-format
    choice: Semicolon delimiter, UTF-8 BOM, comma decimal
    reason: Standard for Swiss/German Excel and accounting software
  - id: papaparse-library
    choice: Use papaparse for CSV generation
    reason: Handles edge cases (escaping, quotes) robustly
  - id: namespace-import
    choice: Import papaparse as namespace (import * as Papa)
    reason: Better TypeScript compatibility with @types/papaparse
  - id: export-modal-and-page
    choice: Both modal (inline) and dedicated page modes
    reason: Flexibility - quick export from list pages or full-page configuration
metrics:
  duration: ~45 minutes
  completed: 2026-01-18
---

# Phase 10 Plan 05: CSV Export for Accounting Summary

**One-liner:** Swiss-formatted CSV export with semicolon delimiter, UTF-8 BOM, configurable filters, and live preview.

## What Was Built

### 1. CSV Export Utilities (`src/lib/costs/csv-export.ts`)

Core formatting and generation utilities:

- `formatSwissDate()` - DD.MM.YYYY format
- `formatSwissNumber()` - Comma as decimal separator
- `translateInvoiceStatus()` - German translations
- `translateExpenseCategory()` - German translations
- `generateCSV()` - Papa Parse wrapper with semicolon delimiter
- `addUTF8BOM()` - Excel compatibility
- `mapInvoiceToExportRow()` / `mapExpenseToExportRow()` - Data transformers

### 2. Export API Route (`src/app/api/costs/export/route.ts`)

Two endpoints:

- **POST** - Generate and download CSV file
  - Filters: type, projectId, dateFrom, dateTo, status
  - Returns CSV with Content-Disposition header
  - Swiss formatting applied server-side

- **GET** - Preview row counts
  - Same filters, returns counts only
  - Used for live preview in UI

### 3. Export Modal (`src/components/costs/ExportModal.tsx`)

Full-featured modal for inline export configuration:

- Export type selection (Alle, Rechnungen, Ausgaben)
- Project filter dropdown
- Date range picker
- Status filter chips (multi-select)
- Live preview of row counts
- Download triggers API call
- Accessible with focus trap and keyboard handling

### 4. Export Button (`src/components/costs/ExportButton.tsx`)

Reusable button component:

- Modal mode (when projects prop provided)
- Link mode (navigates to export page)
- Used on Rechnungen and Ausgaben pages

### 5. Export Page (`src/app/dashboard/kosten/export/`)

Dedicated full-page export interface:

- `page.tsx` - Server component with help documentation
- `ExportForm.tsx` - Client form with same functionality as modal
- Format documentation (columns, dates, numbers, Excel tips)

### 6. Page Integrations

Export buttons added to:

- `/dashboard/kosten/rechnungen` - Modal mode with projects
- `/dashboard/kosten/ausgaben` - Link mode to export page

## CSV Format

| Column | Description |
|--------|-------------|
| Datum | Invoice/payment date (DD.MM.YYYY) |
| Typ | Rechnung or Ausgabe |
| Belegnummer | Invoice/receipt number |
| Partner | Vendor/contractor name |
| Projekt | Renovation project name |
| Netto | Net amount (comma decimal) |
| MwSt | VAT amount (invoices only) |
| Brutto | Gross total |
| Status | Translated status/category |
| Bezahlt | Payment date |

**Format specs:**
- Delimiter: Semicolon (;)
- Encoding: UTF-8 with BOM
- Quotes: Enabled for all fields
- Date: DD.MM.YYYY
- Number: Comma as decimal separator

## Key Technical Decisions

1. **Semicolon delimiter** - Swiss/German Excel opens correctly without import dialog
2. **UTF-8 BOM** - Ensures Excel reads umlauts and special characters correctly
3. **Server-side formatting** - Consistent output regardless of client locale
4. **Papa Parse** - Handles CSV edge cases (escaping commas in text, quotes)
5. **Namespace import** - TypeScript compatibility with @types/papaparse

## Commits

| Hash | Message |
|------|---------|
| b75ee61 | chore(10-05): add papaparse library for CSV export |
| c876099 | feat(10-05): add CSV export utilities with Swiss formatting |
| 8408b68 | feat(10-05): add CSV export API route |
| 5046a31 | feat(10-05): add ExportModal component |
| 6375796 | feat(10-05): add dedicated export page |
| a852ff7 | feat(10-05): add export buttons to cost pages |
| 589f9b3 | fix(10-05): use namespace import for papaparse |

## Verification

- [x] POST /api/costs/export returns valid CSV file
- [x] CSV opens correctly in Swiss Excel (semicolon delimiter, UTF-8)
- [x] Dates formatted as DD.MM.YYYY
- [x] Numbers use comma as decimal separator
- [x] VAT columns populated for invoices
- [x] Status values translated to German
- [x] File downloads with appropriate filename
- [x] Build passes without errors

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Phase 10 Complete. All 5 plans executed:
- 10-01: Invoice Submission & Approval
- 10-02: Manual Expense Entry
- 10-03: Payment Recording
- 10-04: Project Cost Dashboard
- 10-05: CSV Export for Accounting

Ready for Phase 11: History & Digital Twin.
