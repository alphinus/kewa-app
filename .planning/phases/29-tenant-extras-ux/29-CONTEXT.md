# Phase 29 Context: Tenant Extras & UX Improvements

## Overview

This document captures implementation decisions for Phase 29. Researchers and planners should treat these as constraints, not suggestions.

## Decisions

### 1. Notification Content & Triggers

**Trigger conditions:**
- Tenant receives notification for ALL status transitions (offen → in_bearbeitung → geschlossen)
- Tenant receives notification when KEWA replies to a message thread

**Email format:**
- HTML styled emails (not plain text)
- Include actual message/status content inline
- Include link to portal for full context

**Push notification behavior:**
- Click opens the specific ticket in portal
- If tenant has no push subscription: silent fallback to email-only
- Track delivery status (success/failed) for debugging

**Fallback chain:** Push → Email → Tracked as undelivered

### 2. Ticket-to-Work-Order Mapping

**Conversion flow:**
- Operator manually selects work order type during conversion (no auto-mapping from ticket category)
- One-click conversion button on ticket detail view

**Field handling:**
- Ticket photos are COPIED to work order (not linked/referenced)
- Ticket description becomes work order description
- Operator selects property/unit/type manually

**Post-conversion behavior:**
- Ticket auto-closes with status message
- Tenant sees "Ihr Ticket wurde in einen Arbeitsauftrag umgewandelt" in portal
- Link between ticket and work order stored (operator can trace origin)

### 3. Tenant Profile Scope

**Editable fields:**
- Phone number
- Emergency contact name
- Emergency contact phone

**Read-only fields:**
- Email address (prevents auth complications)
- Unit assignment (admin-controlled)
- Tenant name (admin-controlled)

**Password management:**
- No in-profile password change
- Password reset via "Passwort vergessen" flow on login page only

### 4. UX Pattern Standards

**Empty states:**
- Include descriptive text explaining what would appear
- Include CTA button to create first item (e.g., "Keine Liegenschaften" → [+ Liegenschaft erstellen])
- German language throughout

**Confirmation dialogs:**
- Required for: Delete operations, Ticket-to-work-order conversion
- NOT required for: Status changes, navigation, non-destructive actions

**Breadcrumbs:**
- Condensed format: Property > Unit > Current item
- Example: Musterstrasse 1 > Einheit 3.1 > Aufgabe #3
- Skip Dashboard/top-level navigation in breadcrumb path

**Loading states:**
- Skeleton loaders (gray placeholder shapes matching content layout)
- NOT spinners with "Laden..." text

**Error handling:**
- User-friendly German error messages
- Retry button where applicable
- No technical jargon exposed to users

**Form validation:**
- Inline validation errors (shown next to field)
- German error messages
- Validate on blur + on submit

## Out of Scope

None captured — all suggestions stayed within phase boundary.

## Open Questions

None — all areas clarified.

---
*Generated: 2026-02-03 via /gsd:discuss-phase*
