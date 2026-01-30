# Phase 27: PWA Foundation - Research

**Researched:** 2026-01-30
**Domain:** Progressive Web Apps (PWA) with Next.js 16 App Router
**Confidence:** HIGH

## Summary

This phase implements PWA functionality by expanding the existing push notification service worker (`public/sw.js`) to handle offline caching and install prompts. Next.js 16 provides native manifest support via `app/manifest.ts`, enabling dynamic manifest generation without external plugins. The critical constraint is manual service worker expansion to avoid Turbopack conflicts (no Serwist or workbox-webpack-plugin).

The standard approach combines:
1. **Next.js metadata API** for dynamic PWA manifest generation
2. **Manual service worker** expansion using `importScripts()` pattern
3. **Cache API** with network-first (pages) and cache-first (assets) strategies
4. **`beforeinstallprompt` event** handling for custom install UX
5. **`navigator.onLine`** for connectivity status (with known reliability caveats)

**Primary recommendation:** Expand existing `public/sw.js` by adding install/activate/fetch handlers alongside existing push handlers. Use `importScripts()` pattern to keep push notification logic separate from caching logic, ensuring both features coexist without conflicts.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.2 (current) | PWA manifest via metadata API | Native support, no plugins needed |
| Cache API | Browser native | Offline storage of responses | Web standard, universal browser support |
| Service Worker API | Browser native | Install/activate/fetch lifecycle | Web standard for PWAs |
| `navigator.onLine` | Browser native | Connectivity detection | Simple binary check (online/offline) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 (installed) | Install prompt toast | Already in project for notifications |
| localStorage | Browser native | Track dismissed install prompts | Session-based re-prompting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual SW | Serwist | Conflicts with Turbopack (locked decision: manual only) |
| Manual SW | workbox-webpack-plugin | Same Turbopack conflict |
| Manual SW | next-pwa | Deprecated, Webpack-only, not compatible with App Router |
| Cache API | IndexedDB (Dexie) | Phase 28 adds IndexedDB for data; this phase uses Cache API for HTTP responses |

**Installation:**
No new packages required. All functionality uses browser APIs and existing `sonner@2.0.7`.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── manifest.ts                # Dynamic PWA manifest (Next.js metadata API)
│   └── (operator)/                # Operator app with offline support
│       └── settings/page.tsx      # Manual install button
public/
├── sw.js                          # Main service worker (expanded from Phase 24)
├── sw-cache.js                    # Caching logic (imported via importScripts)
├── icons/
│   ├── icon-192.png               # Standard icon
│   ├── icon-512.png               # Standard icon
│   ├── icon-192-maskable.png      # Adaptive icon for Android
│   └── icon-512-maskable.png      # Adaptive icon for Android
```

### Pattern 1: Service Worker Merging via importScripts

**What:** Combine push notification handlers (existing) with caching logic (new) without file conflicts

**When to use:** When one service worker already exists and you need to add new functionality

**Example:**
```javascript
// public/sw.js (existing file, expanded)
/**
 * KEWA Service Worker
 * Handles push notifications (Phase 24) and offline caching (Phase 27)
 */

// Import caching logic separately to keep concerns separated
importScripts('/sw-cache.js')

// Existing push notification handlers (Phase 24)
self.addEventListener('push', (event) => { /* existing code */ })
self.addEventListener('notificationclick', (event) => { /* existing code */ })
self.addEventListener('pushsubscriptionchange', (event) => { /* existing code */ })
```

**Source:** [Medium: Merging Multiple Service Worker Scripts](https://medium.com/tengio-ltd/merging-multiple-service-worker-scripts-in-the-same-scope-83213da915ad), [MDN: importScripts()](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)

### Pattern 2: Network-First with Timeout Fallback

**What:** Attempt network request with timeout, fall back to cache if network slow/offline

**When to use:** For HTML pages where fresh content is preferred but offline access is acceptable

**Example:**
```javascript
// public/sw-cache.js
const CACHE_NAME = 'kewa-v1'
const NETWORK_TIMEOUT = 3000 // 3 seconds

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only cache same-origin requests
  if (url.origin !== self.location.origin) return

  // Network-first for pages
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithTimeout(request))
  }
  // Cache-first for static assets
  else if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirstWithTimeout(request) {
  try {
    // Race network request against timeout
    const networkPromise = fetch(request)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
    )

    const response = await Promise.race([networkPromise, timeoutPromise])

    // Cache successful response for future offline use
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())

    return response
  } catch (error) {
    // Network failed or timed out - try cache
    const cached = await caches.match(request)
    if (cached) return cached

    // No cache - return offline page or error
    return new Response('Offline', { status: 503 })
  }
}

function isStaticAsset(url) {
  return /\.(js|css|woff2|woff|ttf|png|jpg|jpeg|svg|ico)$/.test(url)
}
```

**Source:** [ServiceWorker Cookbook: Network or Cache](https://serviceworke.rs/strategy-network-or-cache_service-worker_doc.html), [GitHub Gist: Network First Example](https://gist.github.com/JMPerez/8ca8d5ffcc0cc45a8b4e1c279efd8a94)

### Pattern 3: Cache-First for Static Assets

**What:** Check cache first, only fetch from network if cache miss, then cache for future

**When to use:** For versioned static assets (CSS, JS, fonts, images) that don't change frequently

**Example:**
```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  const cache = await caches.open(CACHE_NAME)
  cache.put(request, response.clone())

  return response
}
```

**Source:** [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

### Pattern 4: Dynamic Manifest Generation

**What:** Generate PWA manifest server-side using Next.js metadata API with app-specific values

**When to use:** When manifest values need to be dynamic (app name from settings, theme color from config)

**Example:**
```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  // Read app name from system settings (dynamic)
  // For now, hardcode; later fetch from database/config
  const appName = 'KeWa' // TODO: fetch from settings

  return {
    name: appName,
    short_name: appName,
    description: 'KeWa facility management app',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a', // Tailwind slate-900 (match app header)
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
```

**Source:** [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Medium: NextJS PWA with dynamic manifest](https://medium.com/@stefanfrancis/nextjs-pwa-with-dynamic-manifest-be8b804ceb92)

### Pattern 5: beforeinstallprompt Handling

**What:** Capture browser's install prompt event, defer it, show custom UI after login

**When to use:** For guided install experience tied to user engagement (e.g., post-login)

**Example:**
```typescript
// Client component (runs in browser)
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setCanInstall(true)

      // Check if user dismissed in this session
      const dismissed = sessionStorage.getItem('install-prompt-dismissed')
      if (!dismissed) {
        // Show toast after login (caller triggers this)
        showInstallToast()
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const showInstallToast = () => {
    toast('App installieren', {
      description: 'Installiere die App für schnelleren Zugriff',
      action: {
        label: 'Installieren',
        onClick: () => triggerInstall(),
      },
      onDismiss: () => {
        sessionStorage.setItem('install-prompt-dismissed', 'true')
      },
    })
  }

  const triggerInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`Install prompt outcome: ${outcome}`)

    deferredPrompt = null
    setCanInstall(false)
  }

  return { canInstall, triggerInstall }
}
```

**Source:** [MDN: Trigger Install Prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [web.dev: Installation Prompt](https://web.dev/learn/pwa/installation-prompt)

### Pattern 6: Connectivity Status Tracking

**What:** Listen to online/offline events, show visual indicator and toasts on state change

**When to use:** Binary connectivity awareness without deep network quality analysis

**Example:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Wieder verbunden')
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Verbindung verloren', { duration: Infinity })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Header component usage
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center gap-2 text-sm text-amber-600">
      <WifiOff className="h-4 w-4" />
      <span>Offline</span>
    </div>
  )
}
```

**Source:** [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events)

### Anti-Patterns to Avoid

- **Don't replace existing service worker** - Expand `public/sw.js` using `importScripts()`, don't create a new file that breaks push notifications
- **Don't set icon purpose to "any maskable"** - Use separate icons with distinct purposes; combined purpose looks wrong on some platforms ([DEV: Why not "any maskable"](https://dev.to/progressier/why-a-pwa-app-icon-shouldnt-have-a-purpose-set-to-any-maskable-4c78))
- **Don't pre-cache all routes** - Use runtime caching only; pre-caching bloats service worker and wastes bandwidth
- **Don't rely solely on `navigator.onLine`** - It returns false positives (connected to LAN without internet); use as hint only, not truth ([GitHub: Uppy Issue #1658](https://github.com/transloadit/uppy/issues/1658))
- **Don't call `prompt()` multiple times** - `beforeinstallprompt` event's `prompt()` can only be called once per event; reset state after use ([MDN: beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event))

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Install prompt tracking | Custom event system | `beforeinstallprompt` event + sessionStorage | Browser provides event; sessionStorage handles dismissal tracking |
| Offline detection | Custom network probes | `navigator.onLine` + online/offline events | Browser handles; custom probes unreliable and waste battery |
| Cache versioning | Manual cache key logic | Service worker `activate` event with version constant | Standard lifecycle handles cleanup automatically |
| Response caching | Custom IndexedDB storage | Cache API (`caches.match/put`) | Cache API designed for HTTP responses; simpler than IndexedDB |
| Icon generation | Manual image scaling | Favicon generator tools + maskable.app | Edge cases (maskable safe zone) complex; tools handle correctly |

**Key insight:** PWA APIs are mature and well-supported. Custom solutions introduce bugs (e.g., cache invalidation, event timing). Use browser APIs directly unless framework abstracts them (like Next.js manifest).

## Common Pitfalls

### Pitfall 1: Service Worker Update Delays

**What goes wrong:** Browser caches service worker aggressively; changes don't deploy immediately

**Why it happens:** Browsers treat service workers like application code, caching for 24 hours by default

**How to avoid:**
- Set `Cache-Control: no-cache, no-store, must-revalidate` header for `/sw.js` (already configured in `next.config.ts`)
- Use versioning constant in service worker to force new install:
  ```javascript
  const CACHE_VERSION = 'v1' // Increment when changing caching logic
  ```
- Test with DevTools "Update on reload" during development

**Warning signs:**
- Changes to service worker don't appear in production
- Old cache entries persist after deploy
- Users report stale content

**Source:** [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

### Pitfall 2: Push Notification Handlers Lost

**What goes wrong:** Adding fetch handler breaks push notification delivery

**Why it happens:** Multiple service workers can't share same scope; replacing file loses push handlers

**How to avoid:**
- Use `importScripts('/sw-cache.js')` to add caching logic to existing `public/sw.js`
- Keep push handlers in main file, caching in separate file
- Test both push notifications AND offline functionality after changes

**Warning signs:**
- Push notifications stop working after service worker update
- `notificationclick` events not firing
- Subscription endpoint errors

**Source:** [Medium: Merging Service Workers](https://medium.com/tengio-ltd/merging-multiple-service-worker-scripts-in-the-same-scope-83213da915ad)

### Pitfall 3: beforeinstallprompt Not Firing

**What goes wrong:** Install prompt never appears, even on first visit

**Why it happens:** Browser requires HTTPS + manifest + service worker + user engagement (30s)

**How to avoid:**
- Verify all installability criteria in Chrome DevTools > Application > Manifest
- Check "User engagement" requirement (30-second interaction before event fires)
- Test on Chromium browsers only (Safari/Firefox don't support `beforeinstallprompt`)
- Handle case where event never fires (show message or hide install button)

**Warning signs:**
- `beforeinstallprompt` listener never called
- Manifest warnings in DevTools
- Service worker not active

**Source:** [web.dev: Installation Prompt](https://web.dev/learn/pwa/installation-prompt), [MDN: beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)

### Pitfall 4: navigator.onLine False Positives

**What goes wrong:** App shows "online" when connected to LAN without internet access

**Why it happens:** `navigator.onLine` checks LAN connection, not actual internet connectivity

**How to avoid:**
- Treat `navigator.onLine` as hint, not truth
- Show indicator only when offline (minimize clutter when online)
- Don't disable features based solely on online status
- Rely on actual fetch failures to detect true offline state

**Warning signs:**
- Users report "online" indicator but API requests fail
- Network errors despite online status
- VPN users see incorrect status

**Source:** [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events), [GitHub: Uppy Issue #1658](https://github.com/transloadit/uppy/issues/1658)

### Pitfall 5: Maskable Icon Safe Zone Violation

**What goes wrong:** App icon appears cropped or distorted on Android home screen

**Why it happens:** Maskable icons need 40% safe zone from edges; content outside gets clipped

**How to avoid:**
- Use [maskable.app](https://maskable.app/) to preview icon with different masks
- Keep important content within 80% of icon dimensions (40% margin from edges)
- Provide separate icons with `purpose: "maskable"` vs `purpose: "any"`
- Never use `purpose: "any maskable"` (renders incorrectly on some platforms)

**Warning signs:**
- Icon looks good in browser but clipped on home screen
- Android users report missing logo elements
- Icon edges appear cut off

**Source:** [Maskable.app](https://maskable.app/), [Chrome Lighthouse: Maskable Icon Audit](https://developer.chrome.com/docs/lighthouse/pwa/maskable-icon-audit), [DEV: Why not "any maskable"](https://dev.to/progressier/why-a-pwa-app-icon-shouldnt-have-a-purpose-set-to-any-maskable-4c78)

### Pitfall 6: Network Timeout Too Aggressive

**What goes wrong:** App falls back to cache too quickly on slow 3G, showing stale content

**Why it happens:** Timeout set too low (1s) for real-world mobile networks

**How to avoid:**
- Use 3-5 second timeout for network-first strategy
- Consider longer timeout for initial page load vs. subsequent navigations
- Test on throttled network in DevTools (Fast 3G, Slow 3G)
- Monitor real-world timeout metrics

**Warning signs:**
- Users on mobile report stale content frequently
- Cache used even when network available
- Complaints about "offline" behavior on slow connections

**Source:** [ServiceWorker Cookbook: Network or Cache](https://serviceworke.rs/strategy-network-or-cache_service-worker_doc.html)

## Code Examples

Verified patterns from official sources:

### Service Worker Lifecycle

```javascript
// public/sw-cache.js
const CACHE_VERSION = 'kewa-v1'
const STATIC_ASSETS_CACHE = `${CACHE_VERSION}-static`

// Install: No pre-caching (runtime only per CONTEXT.md)
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('kewa-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Claim all clients immediately
  return self.clients.claim()
})

// Fetch: Network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Implementation from Pattern 2 above
})
```

**Source:** [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

### Install Prompt After Login

```typescript
// src/app/(operator)/layout.tsx or login success handler
'use client'

import { useEffect } from 'react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useAuth } from '@/hooks/use-auth'

export function InstallPromptTrigger() {
  const { user } = useAuth()
  const { canInstall } = useInstallPrompt()

  useEffect(() => {
    // Trigger install prompt after first login
    if (user && canInstall) {
      const dismissed = sessionStorage.getItem('install-prompt-dismissed')
      if (!dismissed) {
        // Toast shown by useInstallPrompt hook
      }
    }
  }, [user, canInstall])

  return null
}
```

### Manual Install Button (Settings Page)

```typescript
// src/app/(operator)/settings/page.tsx
'use client'

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { Download } from 'lucide-react'

export default function SettingsPage() {
  const { canInstall, triggerInstall } = useInstallPrompt()

  return (
    <div>
      {/* Other settings */}

      {canInstall && (
        <button
          onClick={triggerInstall}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded"
        >
          <Download className="h-4 w-4" />
          App installieren
        </button>
      )}
    </div>
  )
}
```

### Offline Indicator in Header

```typescript
// src/components/layout/header.tsx
import { OfflineIndicator } from '@/components/offline-indicator'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
      <div className="flex items-center gap-4">
        <h1>KeWa</h1>
        <OfflineIndicator />
      </div>
      {/* Other header content */}
    </header>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa package | Next.js native manifest API | Next.js 13+ (2022) | No plugin needed; simpler setup |
| Workbox webpack plugin | Manual service worker | Turbopack era (2023+) | Avoids webpack/Turbopack conflicts |
| ApplicationCache API | Service Workers | Deprecated 2015 | Service workers more powerful, standard |
| `<link rel="manifest">` | `app/manifest.ts` | Next.js 13 App Router | Dynamic manifest via TypeScript |
| Pre-caching all routes | Runtime caching only | Modern PWA best practices | Smaller service worker, faster install |

**Deprecated/outdated:**
- **next-pwa:** Webpack-only, not compatible with App Router or Turbopack ([GitHub: next-pwa](https://github.com/shadowwalker/next-pwa))
- **ApplicationCache:** Removed from web standards, don't use
- **Combining push + cache in one file:** Use `importScripts()` to separate concerns

## Open Questions

Things that couldn't be fully resolved:

1. **Dynamic App Name from Settings**
   - What we know: `app/manifest.ts` can be async and read from database/config
   - What's unclear: Performance impact of dynamic manifest fetching on every request
   - Recommendation: Start with hardcoded name, add dynamic fetch in Phase 28 if needed

2. **Tenant Portal Offline Support**
   - What we know: CONTEXT.md says "operator app only" for offline caching
   - What's unclear: Should tenant portal still get manifest/install prompt?
   - Recommendation: Give both apps manifest/install, but only operator app gets caching

3. **Icon Generation from Existing Favicon**
   - What we know: Existing `src/app/favicon.ico` has app logo
   - What's unclear: Best tool to scale ICO to PNG with maskable safe zone
   - Recommendation: Use [maskable.app](https://maskable.app/) editor to create maskable variants manually

## Sources

### Primary (HIGH confidence)

- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - Official Next.js 16 documentation
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) - Service worker lifecycle, Cache API
- [MDN: Trigger Install Prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) - beforeinstallprompt best practices
- [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/Online_and_offline_events) - Online/offline events
- [MDN: importScripts()](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts) - Merging service workers

### Secondary (MEDIUM confidence)

- [Build with Matija: Next.js 16 PWA](https://www.buildwithmatija.com/blog/turn-nextjs-16-app-into-pwa) - Recent 2026 Next.js PWA guide
- [LogRocket: Next.js 16 PWA Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support) - 2026 best practices
- [Medium: Merging Service Workers](https://medium.com/tengio-ltd/merging-multiple-service-worker-scripts-in-the-same-scope-83213da915ad) - importScripts pattern
- [ServiceWorker Cookbook: Network or Cache](https://serviceworke.rs/strategy-network-or-cache_service-worker_doc.html) - Network-first timeout pattern
- [web.dev: Installation Prompt](https://web.dev/learn/pwa/installation-prompt) - Install prompt best practices
- [Maskable.app](https://maskable.app/) - Icon editor and validator
- [Chrome Lighthouse: Maskable Icon Audit](https://developer.chrome.com/docs/lighthouse/pwa/maskable-icon-audit) - Icon requirements

### Tertiary (LOW confidence)

- [GitHub: Uppy Issue #1658](https://github.com/transloadit/uppy/issues/1658) - navigator.onLine reliability discussion (real-world problem report)
- [DEV: Why not "any maskable"](https://dev.to/progressier/why-a-pwa-app-icon-shouldnt-have-a-purpose-set-to-any-maskable-4c78) - Icon purpose guidance (community best practice)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js native APIs, browser standards
- Architecture: HIGH - Patterns verified in official docs, multiple sources agree
- Pitfalls: HIGH - Documented in MDN, GitHub issues, real-world experience

**Research date:** 2026-01-30
**Valid until:** 2026-03-30 (60 days - stable web standards, Next.js 16 mature)
