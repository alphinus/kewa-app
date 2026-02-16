# Phase 28: Offline Data Sync — Context

## Phase Goal

Users can read recently viewed data and submit forms while offline, with automatic background sync, conflict resolution, and retry on reconnect.

## Decisions

### 1. Offline Data Scope & Freshness

**Caching trigger:** Hybrid — automatic on view + explicit pin.
- Any entity the user opens gets silently cached in IndexedDB
- Users can explicitly pin important entities (pinned items exempt from eviction)

**Cache depth:** Two levels deep.
- Entity + direct children (e.g., property + its units, work order + its tasks)
- Grandchildren not cached (e.g., unit's individual work orders within a property view)

**Eviction strategy:** Count + time hybrid.
- Keep the N most recently viewed entities per type
- Also purge anything not viewed within X days
- Pinned entities exempt from both eviction rules
- Concrete limits determined during planning (researcher to benchmark IndexedDB storage)

**Staleness indicator:** Only when offline.
- Show "Zuletzt synchronisiert: vor X Stunden/Minuten" on cached entities
- Timestamp only appears when device is actually offline
- When online, data is live — no staleness indicator needed

### 2. Sync Feedback & Error UX

**Sync status location:** Header badge.
- Small counter next to the offline badge (Phase 27) showing pending operations count
- No dedicated sync panel or drawer — keep it minimal

**Failure communication:** Immediate toast.
- Each failed sync operation triggers a toast notification right away
- German text: "Synchronisierung fehlgeschlagen: [entity/action]"

**Conflict notification:** Auto-dismiss toast.
- Standard 4-second toast: "Ihre Aenderungen wurden ueberschrieben"
- No persistent alert or acknowledgment required
- LWW is the resolution — inform, don't block

**Manual sync:** Not supported.
- Sync is purely automatic on reconnect
- No "Jetzt synchronisieren" button
- Reduces UI complexity, sync happens transparently

### 3. Offline Form Behavior

**Form scope:** Common workflows only.
- Work order status updates
- Notes / comments
- Time entries
- Status changes
- NOT: creating new properties, units, suppliers, or other master data
- NOT: tenant portal forms (tenants are home Wi-Fi users per Phase 27 context)

**Validation:** Basic client-side only.
- Required fields and format checks enforced offline
- Relational validation (e.g., "does this supplier exist?") deferred to sync
- Server is the authority — keep offline logic simple

**Queued submission UX:** Optimistic + badge.
- Show submitted data immediately as if saved
- Small "pending sync" indicator on the record (e.g., subtle icon or badge)
- User sees their work reflected instantly, badge provides honest status

**Failed queue handling:** Retry or discard.
- User can retry the failed submission as-is
- User can discard the failed submission
- No editing of queued payloads — too complex, error-prone
- User re-enters fresh if the payload needs changes

### 4. Photo & Attachment Handling Offline

**Compression:** Client-side before storage.
- Resize to max 1920px on longest edge
- Compress to ~80% JPEG quality
- Reduces IndexedDB storage pressure and upload time on slow connections

**Upload strategy:** Sequential.
- One photo at a time on reconnect
- Predictable, less bandwidth pressure on mobile connections
- Avoids overwhelming the server with concurrent uploads

**Progress feedback:** Per-photo progress.
- Individual progress indication for each photo upload
- User sees which photo is uploading and how far along

**Partial sync on photo failure:** Sync form data without the photo.
- Form data (work order update, note, etc.) is the critical payload
- Failed photo stays in queue for retry with exponential backoff
- Toast notification for failed photo: "Foto konnte nicht hochgeladen werden — wird erneut versucht"
- User gets their data synced even if an attachment fails

## Deferred Ideas

None captured.

## Technical Notes for Planner

- Dexie@4.2.1 already approved for IndexedDB (STATE.md decision)
- dexie-react-hooks@4.2.0 for reactive queries
- Last-Write-Wins with server timestamp authority (STATE.md decision)
- Service worker from Phase 27 handles caching — this phase adds IndexedDB data layer on top
- Network-first for API, cache-first for static assets (existing SW strategy)
- Exponential backoff for retries (success criteria #5)
