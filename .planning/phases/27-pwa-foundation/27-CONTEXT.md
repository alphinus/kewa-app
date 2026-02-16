# Phase 27: PWA Foundation — Context

## Install Experience

### Prompt Timing
- Show install prompt **after first login** (operator authenticates → prompt fires)
- Both operator app and tenant portal get the prompt (same behavior)

### Prompt Format
- **Sonner toast** in top-right — consistent with existing feedback pattern (Phase 25-02)
- Auto-dismisses after standard 4-second duration

### Re-Prompt Behavior
- If user dismisses: re-show on **next session** (next login)
- Track dismissal in localStorage with session identifier

### Manual Install Option
- Add an **"App installieren" button in settings page** — always available
- Button only visible when `beforeinstallprompt` event is available (browser supports install)

### App Identity
- **App name**: Read from system settings variable (dynamic from app config, not hardcoded)
- **Icons**: Scale existing favicon/logo to 192x192 and 512x512 + maskable variant
- **Theme color**: Match current brand primary color from the app
- **Display mode**: standalone

## Offline Shell Behavior

### Caching Strategy
- **Runtime caching only** — cache whatever page was last loaded
- No pre-caching of all routes (keep service worker lean)
- Static assets (CSS, JS, fonts): cache-first
- API calls: network-first (locked decision from v3.0 architecture)

### Offline Page Experience
- Cached pages show **skeleton loaders + "Du bist offline" badge** when data cannot load
- No dedicated offline fallback page — use the cached page shell with empty state
- Phase 28 will add IndexedDB data caching for actual offline data reads

### Scope
- **Operator app only** — tenant portal does not get offline shell caching
- Tenant users are home Wi-Fi users; offline is lower priority

### Navigation
- **Network-first pages** — each navigation tries server first, falls back to cache on timeout
- No client-side-only routing; standard Next.js navigation behavior preserved

## Connectivity Indicator

### Visual Design
- **Icon + text** ("Offline") in the header bar
- **Only visible when offline** — no indicator clutter when connected
- Disappears when connection returns

### State Transitions
- **Toast on both directions**:
  - Going offline: "Verbindung verloren" (warning toast)
  - Coming back online: "Wieder verbunden" (success toast)
- Uses existing Sonner toast system

### Granularity
- **Binary only**: online or offline via `navigator.onLine` + online/offline events
- No slow-connection detection (too unreliable, not worth the complexity)

## Locked Decisions (from prior phases)

- Manual service worker expansion — no Serwist (Turbopack conflict)
- Expand existing push notification service worker, do NOT replace
- Network-first for API, cache-first for static assets
- VAPID keys in environment secrets (push continues working)

## Deferred Ideas

(none captured)

---
*Created: 2026-01-30 — Phase 27 context discussion*
