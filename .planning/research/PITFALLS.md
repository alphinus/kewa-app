# Pitfalls Research: KeWa Property Task Management App

**Researched:** 2026-01-16
**Domain:** Mobile-first task management with media upload and speech-to-text
**Primary User:** Non-technical handyman (Imeri) on construction sites
**Confidence:** HIGH (verified with multiple authoritative sources)

## Executive Summary

Building a mobile-first task management app for a non-technical user on construction sites carries significant risks across four areas: (1) **Network reliability** - photo uploads on spotty mobile networks fail silently and frustrate users; (2) **Speech recognition limitations** - Swiss German dialects and construction site noise severely impact transcription accuracy; (3) **UX complexity creep** - features designed for technical users create friction for field workers; (4) **Data model rigidity** - hierarchical task structures become maintenance nightmares when requirements change. The most critical risk is losing Imeri's trust through upload failures or confusing interfaces - a non-technical user will abandon a tool that feels unreliable within days.

---

## Critical Pitfalls

### 1. Silent Upload Failures on Mobile Networks

**Risk Level:** HIGH
**Description:** Photo uploads initiated on construction sites with poor mobile connectivity fail without clear feedback. Users believe photos were uploaded when they were not, leading to missing documentation and lost trust in the app.

**Warning Signs:**
- Users report "photos disappeared"
- Task entries appear without attached photos
- Imeri stops adding photos because "it never works"
- Upload progress indicators hang indefinitely

**Prevention:**
1. **Compress images client-side before upload** - Target 320-720px width for mobile, use WebP format when supported. Reduces upload time from minutes to seconds on slow networks.
2. **Implement offline queue with IndexedDB** - Store photos locally first, mark as "pending upload," sync automatically when connectivity returns.
3. **Show clear upload status** - Use persistent indicators: "Saved locally - syncing" vs "Uploaded" vs "Upload failed - tap to retry"
4. **Auto-retry with exponential backoff** - First retry immediately, second after 5 minutes, third after 15 minutes.
5. **Never lose user data** - Photos must persist locally until confirmed uploaded. Delete only after server acknowledgment.

**Phase to Address:** Phase 1 (Foundation) - Core upload architecture must be built offline-first from the start. Retrofitting is extremely difficult.

**Sources:**
- [Smashing Magazine: Building Offline-Friendly Image Upload](https://www.smashingmagazine.com/2025/04/building-offline-friendly-image-upload-system/)
- [LogRocket: Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)

---

### 2. Swiss German Dialect Recognition Failure

**Risk Level:** HIGH
**Description:** Speech-to-text services struggle with Swiss German dialects, producing Standard German output that may misinterpret meaning, or complete gibberish. Construction site background noise compounds the problem. Word error rates of 15-30% are common even with optimized models.

**Warning Signs:**
- Imeri stops using voice input because "it doesn't understand me"
- Transcriptions contain hallucinated words not in the audio
- Task descriptions are incomprehensible or wrong
- User spends more time correcting transcription than typing

**Prevention:**
1. **Always provide text input fallback** - Voice input must be optional, never required. Some tasks will be faster to type.
2. **Use Whisper API with Standard German output** - Whisper translates Swiss German to Standard German reasonably well (not transcribes), which may be acceptable for task notes.
3. **Show transcription for user confirmation** - Never auto-submit. Always let user review and edit before saving.
4. **Design for partial accuracy** - Expect 80% accuracy at best. UI should make editing easy with large tap targets.
5. **Test with Imeri's actual dialect** - Swiss German varies significantly by region (Zurich vs Basel vs Bern). Test with his specific dialect.
6. **Capture and store original audio** - Allow playback for clarification if transcription is unclear later.

**Phase to Address:** Phase 2 or 3 (Audio Features) - Can be added after core functionality works. Not essential for MVP.

**Sources:**
- [Research: Does Whisper Understand Swiss German?](https://arxiv.org/abs/2404.19310)
- [FHNW: Speech Recognition for Swiss German](https://www.fhnw.ch/en/about-fhnw/schools/school-of-engineering/institutes/research-projects/speech-recognition-for-swiss-german)
- [Hugging Face: Whisper Swiss German Model](https://huggingface.co/Flurin17/whisper-large-v3-turbo-swiss-german)

---

### 3. Touch Targets Too Small for Construction Site Use

**Risk Level:** HIGH
**Description:** Standard mobile UI elements (44px touch targets) are difficult to use with work gloves, dirty fingers, or while moving. Imeri working on a construction site will rage-tap small buttons, trigger wrong actions, and abandon the app.

**Warning Signs:**
- Imeri complains about hitting wrong buttons
- Multiple accidental actions (wrong task selected, wrong button pressed)
- User holds phone very close to face trying to tap correctly
- Imeri takes off gloves to use the app (friction = abandonment)

**Prevention:**
1. **Minimum 76dp touch targets** - Use Google's driving guidelines as baseline (construction = similar constraints to driving). Standard 44px is insufficient.
2. **Extra spacing between targets** - Minimum 16px between clickable elements to prevent accidental taps.
3. **Position critical actions at thumb-reach** - Primary actions in bottom half of screen, not top.
4. **Support gesture-based navigation** - Swipe to complete task, swipe to go back. Fewer precise taps needed.
5. **Test with work gloves** - Actually test the app wearing the same gloves Imeri uses.
6. **High contrast colors** - Outdoor visibility in bright sunlight requires strong contrast.

**Phase to Address:** Phase 1 (Foundation) - UI component library must be designed for field use from the start.

**Sources:**
- [W3C WCAG 2.5.5: Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Google Design for Driving Guidelines](https://support.google.com/accessibility/android/answer/7101858)
- [NN/G: Touch Target Size](https://www.nngroup.com/articles/touch-target-size/)

---

### 4. PIN Authentication Security Theater

**Risk Level:** MEDIUM
**Description:** Simple 4-digit PINs provide minimal security but can still be forgotten, locked out, or cause friction. Over-engineering (rate limiting, lockouts, hashing) creates frustration; under-engineering creates actual security issues.

**Warning Signs:**
- Imeri forgets PIN and can't access app
- Lockout mechanism triggers from pocket-dialing
- PIN entry is slow enough to be frustrating
- No recovery mechanism exists

**Prevention:**
1. **Use device-stored credentials** - PIN unlocks locally stored cryptographic key, not sent to server. Eliminates brute-force attack surface.
2. **Implement "remember device" for 30 days** - PIN required only on new devices or after timeout. Reduces friction on daily use.
3. **No lockouts for 2-user system** - Rate limiting adds friction without security benefit for 2 trusted users. If concerned, add 5-second delay after 3 wrong attempts.
4. **Simple recovery flow** - Admin can reset PIN via separate channel (phone call). No complex "forgot PIN" flows.
5. **Avoid 1234/0000** - Prevent obviously weak PINs but don't over-restrict.
6. **Consider removing PIN entirely** - For 2 trusted users on personal devices, device passcode may be sufficient security.

**Phase to Address:** Phase 1 (Foundation) - Keep authentication minimal. Expand only if security requirements increase.

**Sources:**
- [Wultra: Secure PIN Code](https://www.wultra.com/secure-pin-code-for-financial-apps)
- [LoginRadius: PIN Authentication Security](https://www.loginradius.com/blog/identity/what-is-pin-authentication)

---

### 5. Web Speech API Browser Incompatibility

**Risk Level:** MEDIUM
**Description:** The Web Speech API has only ~50% browser compatibility, doesn't work offline, and fails completely when installed as PWA on iOS Safari. Relying on it as primary input method will break for significant user scenarios.

**Warning Signs:**
- Voice input works on desktop Chrome but fails on Imeri's phone
- Speech recognition requires internet but construction site has poor connectivity
- PWA installation disables voice features on iOS
- Error messages about "speech recognition not supported"

**Prevention:**
1. **Check API availability before showing voice UI** - Feature-detect `webkitSpeechRecognition` and hide voice button if unavailable.
2. **Use server-side Whisper API instead** - Record audio locally with MediaRecorder API (wide support), send to Whisper API for transcription. Works offline (record, transcribe later).
3. **Test on Imeri's actual device/browser** - Don't assume Chrome desktop = Chrome Android = Safari iOS.
4. **Design voice as enhancement, not requirement** - App must be fully usable without voice input.

**Phase to Address:** Phase 2 or 3 - Voice features are enhancement, not core. Build text-first.

**Sources:**
- [Can I Use: Speech Recognition API](https://caniuse.com/speech-recognition)
- [MDN: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

### 6. Hierarchical Data Deletion Cascades

**Risk Level:** MEDIUM
**Description:** Building > Floor > Apartment > Task hierarchy creates cascade deletion problems. Deleting a floor accidentally deletes all apartments and tasks. Reorganizing hierarchy (moving task to different apartment) becomes complex.

**Warning Signs:**
- Accidental deletion wipes significant data
- "Move task" functionality doesn't exist or is broken
- Database queries for "all tasks" are slow due to deep joins
- Adding new hierarchy level requires schema migration

**Prevention:**
1. **Soft delete everything** - Mark deleted, don't remove. Allow recovery.
2. **Flat task storage with references** - Tasks reference apartment_id, not nested in hierarchy. Queries are simpler.
3. **Avoid deep nesting in UI** - Building > Apartment is enough. Skip "floor" unless explicitly needed.
4. **Implement task history** - Track which apartment task belonged to, allowing audit trail if moved.
5. **Confirm destructive actions** - "Delete apartment" shows "This will affect X tasks. Continue?"

**Phase to Address:** Phase 1 (Foundation) - Data model is hardest to change later. Design it flat and flexible.

**Sources:**
- [MongoDB Forums: Tasks and Subtasks](https://www.mongodb.com/community/forums/t/tasks-and-subtasks/147521)
- [Data Integration Info: Hierarchical vs Relational](https://dataintegrationinfo.com/hierarchical-vs-relational-database/)

---

## Mobile-Specific Pitfalls

### 7. Background Sync Unreliable Across Browsers

**Risk Level:** MEDIUM
**Description:** The Background Sync API (for automatic retry of failed uploads) is only supported in Chrome-based browsers. Safari and Firefox don't support it. App behavior differs dramatically across browsers.

**Warning Signs:**
- Uploads retry on Chrome but not Safari
- Users on iOS report different behavior than Android users
- "Sync when online" feature only works sometimes

**Prevention:**
1. **Don't rely on Background Sync API alone** - Implement foreground retry with visual indicator as primary mechanism.
2. **Use polling fallback** - When app is open, periodically check for pending uploads and retry.
3. **Persist upload queue in IndexedDB** - Survive app restarts, browser doesn't matter.
4. **Test on both Android Chrome and iOS Safari** - These are the realistic device scenarios.

**Phase to Address:** Phase 1 (Foundation) - Upload architecture must work without Background Sync.

**Sources:**
- [Can I Use: Background Sync](https://caniuse.com/background-sync)
- [MDN: Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

---

### 8. Large Images Consume Data Plans and Battery

**Risk Level:** MEDIUM
**Description:** Modern phone cameras produce 3-12MB images. Uploading uncompressed over mobile data drains battery, consumes expensive data plans, and fails on slow connections.

**Warning Signs:**
- Uploads take minutes on mobile network
- Imeri complains about data usage
- Battery drains quickly when using app
- Upload timeout errors

**Prevention:**
1. **Compress to 720px width max** - Sufficient quality for documentation, ~100KB vs 5MB original.
2. **Use lossy compression (80% quality)** - Imperceptible quality loss, significant size reduction.
3. **Convert to WebP where supported** - 30% smaller than JPEG at same quality.
4. **Show compression happening** - "Optimizing photo..." so user knows something is happening.
5. **Allow original upload as option** - For cases where full resolution needed.

**Phase to Address:** Phase 1 (Foundation) - Build into upload pipeline from start.

**Sources:**
- [Cloudinary: Image Compression Before Upload](https://cloudinary.com/guides/image-effects/best-ways-to-compress-images-before-upload-in-javascript)
- [Imagify: Optimize Images for Mobile](https://imagify.io/blog/how-to-optimize-images-for-mobile/)

---

### 9. No Offline Indicator

**Risk Level:** LOW
**Description:** Users don't know if they're offline or if the app is broken. They keep trying actions that won't work, get frustrated, and blame the app.

**Warning Signs:**
- User taps save repeatedly thinking it's not working
- Confusion between "saving locally" and "saved to server"
- Support questions about "why isn't it uploading"

**Prevention:**
1. **Always show connection status** - Small indicator: "Online" / "Offline - changes saved locally"
2. **Queue count visible** - "3 items waiting to sync"
3. **Last sync time** - "Last synced: 5 minutes ago"
4. **Different UI states** - Pending items visually distinct from synced items.

**Phase to Address:** Phase 1 (Foundation) - Part of core offline-first architecture.

**Sources:**
- [API Ninjas: Designing for Poor Connectivity](https://www.api-ninjas.com/blog/designing-apps-with-poor-connectivity-in-mind)

---

## UX Pitfalls for Non-Technical Users

### 10. Technical Error Messages

**Risk Level:** HIGH
**Description:** Error messages like "Error 500: Internal Server Error" or "Network request failed" mean nothing to Imeri. He won't know if he did something wrong, if the app is broken, or what to do next.

**Warning Signs:**
- User screenshots error and asks "what does this mean?"
- User gives up when error appears instead of retrying
- User blames himself for "breaking" the app
- Support questions about every error type

**Prevention:**
1. **Human-readable messages only** - "Could not save. Check your internet connection and try again."
2. **Always include action** - Every error message has a button: "Try Again" / "Save Offline" / "Contact Support"
3. **Never blame user** - "Something went wrong" not "You entered invalid data"
4. **No error codes visible** - Log codes for debugging, show friendly message to user.
5. **Test messages with Imeri** - Show him error mockups, ask what he'd do. Iterate.

**Phase to Address:** Phase 1 (Foundation) - Error handling is core UX.

**Sources:**
- [Smashing Magazine: Error States for Mobile Apps](https://www.smashingmagazine.com/2016/09/how-to-design-error-states-for-mobile-apps/)
- [NN/G: Error Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)

---

### 11. Too Many Options and Settings

**Risk Level:** HIGH
**Description:** Every setting, option, and configuration adds cognitive load. Non-technical users are paralyzed by choice and intimidated by settings screens. The app should make decisions for them.

**Warning Signs:**
- Imeri never changes any settings
- User asks "which option should I pick?"
- Features go unused because they require configuration
- Onboarding takes more than 2 minutes

**Prevention:**
1. **Make decisions, don't offer choices** - Pick reasonable defaults, hide advanced options.
2. **No settings screen for v1** - Everything has sensible defaults.
3. **Progressive disclosure** - Basic view by default, reveal complexity only when needed.
4. **One clear path** - Each screen has one obvious action to take.
5. **Remove features that need explanation** - If it needs a tutorial, it's too complex.

**Phase to Address:** All phases - Constant discipline required. Review every feature for complexity.

**Sources:**
- [AlterSquare: Construction Tech UX](https://altersquare.medium.com/why-construction-tech-ux-is-different-designing-for-jobsite-realities-fef93f431721)

---

### 12. Requiring Account Creation / Email

**Risk Level:** MEDIUM
**Description:** Imeri doesn't want to create an account, verify an email, or remember a username. Any friction before using the app risks abandonment. He has one email he checks rarely.

**Warning Signs:**
- User never completes signup
- "Forgot password" requests
- Confusion about username vs email
- Account verification emails go to spam

**Prevention:**
1. **PIN-only authentication** - No email, no username, no password. Just PIN.
2. **Pre-create accounts** - You create Imeri's account, give him PIN. Zero signup friction.
3. **Device-based identity** - Device is the identity, PIN is the lock. No "login" needed.
4. **No email verification** - Not needed for 2-user app.

**Phase to Address:** Phase 1 (Foundation) - Simple auth from start.

---

### 13. Assuming Literacy with German Technical Terms

**Risk Level:** MEDIUM
**Description:** Technical UI terms ("synchronisieren," "hochladen," "archivieren") may not be in Imeri's working vocabulary, especially for Swiss German speakers who encounter Standard German tech terms.

**Warning Signs:**
- User asks what buttons mean
- Wrong button pressed due to confusion
- User avoids features with unfamiliar names

**Prevention:**
1. **Use icons with labels** - Camera icon + "Foto" not just "Anhang hinzufugen"
2. **Test labels with Imeri** - Show mockups, ask what he thinks each button does.
3. **Use action verbs** - "Speichern" (save) not "Synchronisieren" (sync)
4. **Consider Swiss German option** - "Uflade" instead of "Hochladen" if feasible.

**Phase to Address:** Phase 1 (Foundation) - Part of UI design.

---

## Technical Pitfalls

### 14. Building Desktop-First, Then "Making It Mobile"

**Risk Level:** HIGH
**Description:** Designing on desktop monitors leads to information-dense layouts that don't translate to mobile. Retrofitting mobile responsiveness onto desktop-first designs results in cramped, unusable mobile experiences.

**Warning Signs:**
- Desktop version works great, mobile is painful to use
- "Just make it responsive" conversations
- Tables and multi-column layouts on mobile
- Horizontal scrolling required

**Prevention:**
1. **Design mobile-first, literally** - Start Figma/sketches at 375px width.
2. **Develop mobile-first** - Test every feature on phone before desktop.
3. **Imeri's phone is the reference device** - Design for his actual screen size.
4. **No tables** - Use cards/lists that stack vertically.
5. **Touch-first interactions** - Tap/swipe, not hover/click.

**Phase to Address:** Phase 1 (Foundation) - Must be development culture from day 1.

**Sources:**
- [Triare: Mobile-First Design 2025](https://triare.net/insights/mobile-first-design-2025/)

---

### 15. Over-Engineering the Building Visualization

**Risk Level:** MEDIUM
**Description:** The "graphical building visualization" requirement can lead to complex SVG/Canvas implementations that are fragile, hard to maintain, and don't add proportional value over simple lists.

**Warning Signs:**
- Weeks spent on visualization while core features wait
- Visualization doesn't work on all screen sizes
- Touch interactions on visualization are buggy
- Maintaining visualization consumes ongoing effort

**Prevention:**
1. **Start with simple grid** - 13 apartments in a CSS grid with tap targets. No SVG.
2. **Add visual polish later** - Get functionality working first.
3. **Keep visualization optional** - List view must always work.
4. **Set time-box** - Maximum 1 week on visualization. If not done, ship grid.

**Phase to Address:** Phase 2 or later - After core task management works.

---

### 16. Not Handling Camera Permissions Gracefully

**Risk Level:** MEDIUM
**Description:** First-time camera permission prompts are confusing. If user denies, app breaks. If permission is revoked in settings, app shows cryptic errors.

**Warning Signs:**
- "Camera doesn't work" support requests
- User denied permission once, now can't figure out how to enable
- Different behavior across browsers/devices

**Prevention:**
1. **Explain before prompting** - "To add photos, we need camera access" with "Allow" button that triggers permission.
2. **Handle denial gracefully** - Show instructions to enable in settings, not error message.
3. **Offer file picker fallback** - If camera denied, allow selecting from gallery.
4. **Test permission flows** - Specifically test: first grant, first deny, revoked in settings.

**Phase to Address:** Phase 1 (Foundation) - Part of photo upload feature.

---

## Pitfall Prevention Checklist

### Phase 1: Foundation
- [ ] Offline-first architecture with IndexedDB queue
- [ ] Client-side image compression (720px max, WebP)
- [ ] 76dp minimum touch targets
- [ ] Flat data model with soft deletes
- [ ] Human-readable error messages with retry actions
- [ ] Connection status indicator
- [ ] Mobile-first development (test on phone first)
- [ ] PIN-only auth with device storage
- [ ] Camera permission handling with fallback
- [ ] No Background Sync API dependency

### Phase 2: Audio Features (if included)
- [ ] Voice input as enhancement, not requirement
- [ ] Text input always available as fallback
- [ ] Whisper API for transcription (not Web Speech API)
- [ ] User confirmation before saving transcription
- [ ] Test with Imeri's specific dialect
- [ ] Store original audio for playback

### All Phases
- [ ] No settings screens or configuration
- [ ] One clear action per screen
- [ ] Icons with simple labels
- [ ] Test every feature with Imeri before shipping
- [ ] No technical jargon in any user-facing text

---

## Sources Summary

### Primary (HIGH Confidence)
- [MDN Web Docs: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MDN Web Docs: Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [W3C WCAG: Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Can I Use: Background Sync](https://caniuse.com/background-sync)
- [Can I Use: Speech Recognition](https://caniuse.com/speech-recognition)

### Secondary (MEDIUM Confidence)
- [Smashing Magazine: Offline-Friendly Image Upload](https://www.smashingmagazine.com/2025/04/building-offline-friendly-image-upload-system/)
- [LogRocket: Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Arxiv: Does Whisper Understand Swiss German?](https://arxiv.org/abs/2404.19310)
- [NN/G: Touch Target Size](https://www.nngroup.com/articles/touch-target-size/)
- [NN/G: Error Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [AlterSquare: Construction Tech UX](https://altersquare.medium.com/why-construction-tech-ux-is-different-designing-for-jobsite-realities-fef93f431721)
- [Cloudinary: Image Compression](https://cloudinary.com/guides/image-effects/best-ways-to-compress-images-before-upload-in-javascript)

### Tertiary (Supporting Research)
- [FHNW: Speech Recognition for Swiss German](https://www.fhnw.ch/en/about-fhnw/schools/school-of-engineering/institutes/research-projects/speech-recognition-for-swiss-german)
- [Wultra: Secure PIN Code](https://www.wultra.com/secure-pin-code-for-financial-apps)
- [Portotheme: File Upload Features 2025](https://www.portotheme.com/10-file-upload-system-features-every-developer-should-know-in-2025/)

---

**Research Confidence Breakdown:**
- Mobile upload pitfalls: HIGH (multiple authoritative sources, well-documented patterns)
- Swiss German speech recognition: HIGH (academic research papers, benchmarks available)
- Touch target requirements: HIGH (W3C standards, Google guidelines)
- Non-technical user UX: MEDIUM (best practice articles, construction-specific research limited)
- PIN authentication: MEDIUM (security best practices, context-specific recommendations)

**Research Date:** 2026-01-16
**Valid Until:** 2026-04-16 (3 months - stable recommendations, browser support may evolve)
