---
phase: 27-pwa-foundation
plan: 03
subsystem: ui
tags: [connectivity, toast, sonner, pwa, offline]

# Dependency graph
requires:
  - phase: 25-02
    provides: Sonner toast library with 4-second German messages
  - phase: 27-01
    provides: PWA manifest and install prompt infrastructure
provides:
  - ConnectivityContext tracking online/offline status with toast notifications
  - Header offline badge showing connectivity state
  - Dashboard layout wrapped with ConnectivityProvider (operator app only)
affects: [28-offline-shell, 29-sync-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Connectivity context with navigator.onLine and window events"
    - "Initial mount tracking to prevent toast spam on first render"
    - "Binary connectivity detection (online/offline only, no slow-connection)"

key-files:
  created:
    - src/contexts/ConnectivityContext.tsx
  modified:
    - src/components/navigation/header.tsx
    - src/app/dashboard/layout.tsx

key-decisions:
  - "Operator app only - portal layout unchanged per CONTEXT.md (home Wi-Fi users)"
  - "Initial mount 100ms delay prevents toasts on first page load"
  - "Amber warning color for offline badge matching app design language"

patterns-established:
  - "Connectivity provider wraps dashboard after session load"
  - "Toast on both transitions: warning (offline), success (online)"
  - "SSR-safe navigator.onLine check with undefined fallback"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 27 Plan 03: Connectivity Indicator Summary

**Header offline badge with toast notifications using navigator.onLine and Sonner for 4-second German warnings**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T10:35:36Z
- **Completed:** 2026-01-30T10:40:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ConnectivityContext tracks online/offline status with window event listeners
- Toast notifications fire on state transitions (warning offline, success online)
- Header displays amber "Offline" pill badge with WifiOff icon when disconnected
- Dashboard layout wrapped with ConnectivityProvider (operator app only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Connectivity context with toast notifications** - `121ed73` (feat)
2. **Task 2: Header offline badge and layout provider integration** - `7d1ce76` (feat)

## Files Created/Modified
- `src/contexts/ConnectivityContext.tsx` - React context providing isOnline boolean, navigator.onLine tracking, toast notifications on transitions
- `src/components/navigation/header.tsx` - Added offline indicator badge (amber pill with WifiOff icon, visible only when !isOnline)
- `src/app/dashboard/layout.tsx` - Wrapped DashboardLayoutInner with ConnectivityProvider

## Decisions Made

**1. Operator app only - portal layout unchanged**
Per CONTEXT.md, offline features are operator-app only. Tenant portal users are home Wi-Fi users with lower offline priority. ConnectivityProvider wraps dashboard layout but NOT portal layout.

**2. Initial mount tracking prevents first-load toasts**
Used `useRef` with 100ms delay to prevent toast spam when page first loads with existing connectivity state. Toasts only fire on actual transitions after initial mount.

**3. Amber warning color for offline badge**
`bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400` matches app's design language for warning states and provides clear visual distinction from normal header elements.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 28 (Offline Shell):**
- Connectivity detection in place
- Toast notifications working
- Header badge provides clear visual feedback
- Provider wraps operator app only (correct isolation)

**No blockers.**

---
*Phase: 27-pwa-foundation*
*Completed: 2026-01-30*
