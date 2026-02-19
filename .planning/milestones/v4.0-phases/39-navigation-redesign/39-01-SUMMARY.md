---
phase: 39-navigation-redesign
plan: 01
subsystem: navigation
tags: [mobile-nav, bottom-sheet, ux, navigation]
dependency_graph:
  requires: []
  provides: [mobile-footer-5-items, mehr-bottom-sheet, slide-in-bottom-animation]
  affects: [src/app/dashboard/layout.tsx]
tech_stack:
  added: []
  patterns: [controlled-component, body-scroll-lock, fixed-backdrop-dismiss]
key_files:
  created:
    - src/components/navigation/MehrBottomSheet.tsx
  modified:
    - src/components/navigation/mobile-nav.tsx
    - src/app/globals.css
decisions:
  - MehrBottomSheet rendered inside MobileNav fragment sibling to nav — avoids layout.tsx changes, z-[60] places it above nav z-50
  - MEHR_ROUTES array in mobile-nav.tsx drives Mehr button active state — pathname startsWith check covers nested routes
  - Body scroll lock via useEffect with open dep, cleanup restores overflow on unmount
metrics:
  duration: 8min
  completed: 2026-02-18
  tasks_completed: 2
  files_changed: 3
---

# Phase 39 Plan 01: Mobile Footer 5-Item Redesign + MehrBottomSheet Summary

**One-liner:** 8-item mobile footer collapsed to 5 items (4 links + Mehr button) with a 10-item slide-up bottom sheet using CSS keyframe animation and backdrop dismiss.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create MehrBottomSheet and update MobileNav to 5 items | 1b73567 | MehrBottomSheet.tsx, mobile-nav.tsx, globals.css |
| 2 | Wire MobileNav into dashboard layout (verify only) | — | No changes required |

## What Was Built

**MehrBottomSheet** (`src/components/navigation/MehrBottomSheet.tsx`):
- `'use client'` component accepting `open: boolean` and `onClose: () => void`
- Body scroll lock via `useEffect` — restores `overflow` on unmount
- Fixed backdrop `fixed inset-0 bg-black/50 z-[60]` with click-to-dismiss
- Inner container with `rounded-t-2xl`, drag handle bar, and `animate-slide-in-bottom` CSS animation
- 10 overflow items in `grid grid-cols-4 gap-2` — each a Next.js Link with `onClick={onClose}`
- Items: Projekte, Lieferanten, Berichte, Abnahmen, Anderungsauftrage, Vorlagen, Knowledge Base, Audio, Benachrichtigungen, Einstellungen
- Early return `if (!open) return null`

**MobileNav** (`src/components/navigation/mobile-nav.tsx`):
- `internalNavItems` reduced to 4: Ubersicht, Objekte, Aufgaben, Kosten
- Imports cleaned: added `Banknote`, `Menu`; removed `Building2`, `FileText`, `Archive`, `Settings`, `Truck`
- `useState` for `mehrOpen` state
- `MEHR_ROUTES` array (10 routes) drives Mehr button active detection via `pathname.startsWith`
- 5th nav item is a `<button>` (not Link) with `Menu` icon, opens bottom sheet on click
- Active state: `isMehrActive = MEHR_ROUTES.some(match) || mehrOpen`
- Fragment wrapper `<>` renders both `<nav>` and `<MehrBottomSheet>` as siblings

**CSS** (`src/app/globals.css`):
- `@keyframes slideInFromBottom` — translateY(100%) to translateY(0)
- `.animate-slide-in-bottom` utility — 0.25s ease-out forwards

**Dashboard layout** (`src/app/dashboard/layout.tsx`):
- No changes — already renders `<MobileNav isInternal={user?.isInternal} />` at line 37
- MehrBottomSheet is rendered inside MobileNav, z-[60] places it above nav z-50

## Deviations from Plan

None — plan executed exactly as written.

## Verification

1. `npx tsc --noEmit` — passed with no errors
2. `MehrBottomSheet.tsx` exists and exports `MehrBottomSheet` — confirmed
3. `mobile-nav.tsx` has exactly 4 link items + 1 Mehr button — confirmed
4. `globals.css` contains `slideInFromBottom` keyframe — confirmed
5. Dashboard layout renders MobileNav — confirmed (no changes needed)

## Self-Check: PASSED

- `src/components/navigation/MehrBottomSheet.tsx` — FOUND
- `src/components/navigation/mobile-nav.tsx` — modified, committed 1b73567
- `src/app/globals.css` — modified, committed 1b73567
- Commit 1b73567 — FOUND in git log
