# Features Research: Property Management Task Tracking

**Researched:** 2025-01-16
**Domain:** Property Management / Field Service / Handyman Task Tracking
**Confidence:** MEDIUM-HIGH (based on multiple industry sources, verified patterns)

## Executive Summary

Property management and field service apps share a common feature set that has matured over the past decade. For a simple 2-user, single-building app like KEWA, most enterprise features are unnecessary overhead. The key is implementing rock-solid basics: task creation/completion, photo documentation, and status visibility. The differentiators already planned (graphical building view, voice notes with transcription, weekly reports) are genuinely valuable and not commonly found in simple tools. The biggest anti-feature trap is building enterprise complexity (multi-role permissions, complex workflows, advanced analytics) that adds development burden without value for two users.

**Primary recommendation:** Focus ruthlessly on the core loop (create task -> do task -> photo proof -> mark done -> report) and ship the differentiators (building view, voice notes) as polish, not blockers.

---

## Table Stakes Features

These are must-have features. Without them, the app fails its core purpose.

### 1. Task/Work Order Management

**Complexity:** LOW
**Already Planned:** Yes (Tasks with title, description, due date, priority, status)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| Create tasks | Core function - no app without it | Keep simple: title, description |
| Task status (open/done) | Minimum viable tracking | Binary is fine for 2 users |
| Task assignment | Handyman needs to know what to do | Implicit in this app (all to Imeri) |
| Due dates | Prioritization and urgency | Simple date picker |
| Task descriptions | Explain what needs doing | Text field sufficient |

**Source:** Every property management and field service app reviewed includes these basics. [Jobber](https://www.getjobber.com/industries/handyman-invoice-software/), [UpKeep](https://upkeep.com/maintenance-software-for/property-management/), [Buildium](https://www.buildium.com/features/maintenance-request-management/)


### 2. Photo Documentation

**Complexity:** LOW-MEDIUM
**Already Planned:** Yes (up to 2 photos per task, each direction)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| Photo upload on completion | Proof of work done | Critical for accountability |
| View photos in task detail | Owner needs to verify | Simple gallery/lightbox |
| Photo storage | Photos must persist | Supabase Storage handles this |

**Source:** [RentRedi](https://rentredi.com/) and [UpKeep](https://apps.apple.com/us/app/upkeep-work-order-maintenance/id921799415) emphasize photo upload as core feature. "Tenants submit photo or video requests in the app" is standard.


### 3. Task List/Dashboard

**Complexity:** LOW
**Already Planned:** Yes (separate dashboards for KEWA AG and Imeri)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| List of open tasks (handyman) | Imeri needs to know what to do | Simple, filterable list |
| Overview of all tasks (owner) | KEWA AG needs visibility | Status-based grouping |
| Filter by status | Find what matters | Open/done minimum |

**Source:** [Maintenance Care](https://www.maintenancecare.com/handyman-work-order-software/) and [Field Service apps](https://www.fieldpromax.com/blog/top-5-features-in-the-field-service-software) all have dashboard views.


### 4. Mobile Access

**Complexity:** MEDIUM (responsive design)
**Already Planned:** Yes (mobile-first)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| Mobile-optimized interface | Imeri works on-site with phone | Responsive design essential |
| Touch-friendly controls | Field use requires easy tapping | Large buttons, clear actions |
| Camera integration | Photo upload from device | Standard browser APIs |

**Source:** "In 2025, mobile access is the game" - [FieldProMax](https://www.fieldpromax.com/blog/top-5-features-in-the-field-service-software). Every modern FSM solution emphasizes mobile-first.


### 5. Simple Authentication

**Complexity:** LOW
**Already Planned:** Yes (PIN-based)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| User identification | Know who did what | PIN per role is sufficient |
| Role-based views | Different needs per user | Two roles: owner/handyman |

**Source:** While enterprise apps use complex auth, small landlord tools like [TurboTenant](https://www.turbotenant.com/) and [Innago](https://innago.com/) emphasize simplicity.


### 6. Location/Unit Organization

**Complexity:** MEDIUM
**Already Planned:** Yes (Building -> Unit -> Project -> Task)

| Feature | Why Table Stakes | Notes |
|---------|------------------|-------|
| Organize by unit/location | Know where work is needed | 13 apartments + common areas |
| Navigate to unit's tasks | Find relevant work | Drill-down navigation |

**Source:** [Buildium](https://www.buildium.com/features/maintenance-request-management/) and property management systems use hierarchical organization. "Centralized property dashboard with a unified view of units" is standard.

---

## Differentiating Features

These add significant value beyond basics. Already planned features marked as such.

### 1. Graphical Building View

**Complexity:** MEDIUM-HIGH
**Already Planned:** Yes
**Differentiator Value:** HIGH

Most property management apps use lists and dropdowns for unit selection. A visual building representation (4 floors + roof, 3 units per floor) provides:
- Instant spatial orientation
- At-a-glance status visibility (color-coded units)
- Intuitive navigation for non-technical users

**Why it differentiates:** Small landlord tools like TurboTenant, Innago, and Landlord Studio use basic lists. Even enterprise tools rarely offer graphical building views for residential. This is a genuine UX advantage.

**Implementation notes:** Can be SVG-based, static layout (building doesn't change). Color-code by task status (green = all done, red = overdue, yellow = pending).


### 2. Voice Notes with Transcription

**Complexity:** MEDIUM-HIGH
**Already Planned:** Yes (KEWA AG only, max 1 min)
**Differentiator Value:** MEDIUM-HIGH

Voice input for task creation is emerging but not standard in property management.

| Aspect | Value |
|--------|-------|
| Speed | Faster than typing on mobile |
| Context | Can describe while looking at problem |
| Accessibility | Easier for some users |

**Source:** [Fulcrum Audio FastFill](https://www.fulcrumapp.com/blog/audio-fastfill-field-data-capture-using-voice-dictation/) reports "20% faster task completion" with voice. [FieldEZ](https://fieldez.com/voice-technology-in-field-service-hands-free-operations-for-mobile-technicians/) notes "voice dictation saves up to 15 minutes per task."

**Why it differentiates:** Most small property management tools lack voice input entirely. The planned hybrid (voice + transcription for owner, audio-only for handyman due to dialect) is practical.


### 3. Weekly Automated Reports

**Complexity:** MEDIUM
**Already Planned:** Yes
**Differentiator Value:** MEDIUM

Automatic summary of completed work provides:
- Accountability documentation
- Progress tracking over time
- Reduced manual reporting effort

**Source:** [Buildium](https://www.buildium.com/blog/examples-of-automated-property-management-systems/) and [Rent Manager](https://www.rentmanager.com/report-automation/) offer automated reports, but this is typically enterprise-tier. [DoorLoop](https://www.doorloop.com/blog/property-management-report) notes "reports may be reviewed weekly or on demand."

**Why it differentiates:** Simple tools rarely auto-generate reports. Usually requires manual export/compilation.


### 4. Recurring Tasks

**Complexity:** LOW-MEDIUM
**Already Planned:** Yes (weekly/monthly)
**Differentiator Value:** MEDIUM

Automatic task generation for routine maintenance:
- Reduces manual task creation
- Ensures nothing forgotten
- Standard intervals (weekly, monthly)

**Source:** [MaintainX](https://www.getmaintainx.com/industries/property-management), [Housecall Pro](https://www.housecallpro.com/industries/property-maintenance-software/), and [Buildium](https://www.buildium.com/blog/best-property-maintenance-software/) all emphasize recurring task scheduling as key feature.

**Why it differentiates:** Many simple tools lack recurring tasks, requiring manual re-creation.


### 5. Before/After Photo Comparison

**Complexity:** LOW (display) / MEDIUM (capture alignment)
**Already Planned:** Partially (photos exist, comparison not specified)
**Differentiator Value:** MEDIUM

Side-by-side comparison of task state before and after work:
- Clear proof of work quality
- Visual progress documentation
- Professional presentation

**Source:** [CompanyCam](https://companycam.com/advanced-features/before-after-photos) and [SiteCam](https://sitecam.io/free-construction-before-after-photo-maker/) specialize in before/after. "Showcase your work projects with Before and After photo feature."

**Recommendation:** Simple side-by-side display is low complexity. Alignment overlay tools are higher complexity - skip for v1.


### 6. Project Grouping

**Complexity:** LOW
**Already Planned:** Yes (Unit -> Project -> Task)
**Differentiator Value:** LOW-MEDIUM

Group related tasks under projects (e.g., "Bathroom Renovation"):
- Better organization for multi-task work
- Progress tracking per project
- Logical grouping for reporting

**Why it differentiates:** Most simple task trackers are flat lists. Hierarchical organization is typically enterprise-tier.

---

## Anti-Features (Deliberately Avoid)

For a 2-user, single-building app, these features add complexity without value.

### 1. Complex User Management

**Complexity if built:** HIGH
**Why avoid:** Only 2 users (KEWA AG and Imeri)

| Skip | Why |
|------|-----|
| User registration/signup | Just two PINs needed |
| Password reset flows | PIN can be changed in config |
| User profiles/avatars | Unnecessary personalization |
| Team management | No team, just two individuals |
| Role hierarchy | Binary roles sufficient |

**Enterprise trap:** Building auth systems that handle "future growth" adds weeks of work for zero current value.


### 2. Multi-Building/Portfolio Management

**Complexity if built:** HIGH
**Why avoid:** Single building only

| Skip | Why |
|------|-----|
| Property selection screen | Only one property |
| Portfolio dashboards | Not a portfolio |
| Cross-property reporting | Nothing to cross |
| Property comparison | Nothing to compare |

**Enterprise trap:** "But what if they want to add buildings later?" - Solve that problem when it exists. Current scope is one building.


### 3. Tenant Portal/Self-Service

**Complexity if built:** MEDIUM-HIGH
**Why avoid:** Tenants are not users of this app

| Skip | Why |
|------|-----|
| Tenant login | Not a user role |
| Maintenance request submission by tenants | KEWA AG creates tasks |
| Tenant notifications | Out of scope |
| Tenant communication features | Not this app's purpose |

**Source:** While [TurboTenant](https://www.turbotenant.com/) and others emphasize tenant portals, this app is owner-handyman only.


### 4. Financial/Invoicing Features

**Complexity if built:** HIGH
**Why avoid:** Explicitly out of scope

| Skip | Why |
|------|-----|
| Invoicing | Not this app's purpose |
| Payment processing | Handled elsewhere |
| Cost tracking per task | Adds complexity |
| Budget management | Not needed |
| Expense categorization | Accounting is separate |

**Already documented:** PROJECT.md lists "Zahlungsabwicklung/Rechnungen" as out of scope.


### 5. Complex Scheduling/Dispatching

**Complexity if built:** MEDIUM-HIGH
**Why avoid:** One handyman, no dispatching needed

| Skip | Why |
|------|-----|
| Calendar-based scheduling | Due dates sufficient |
| Route optimization | One building, no routes |
| GPS tracking | Not needed for single location |
| Dispatch management | Only one person to "dispatch" |
| Time slot booking | Simple due dates work |

**Enterprise trap:** FSM software emphasizes dispatching for multiple technicians. Irrelevant for single handyman.


### 6. Advanced Analytics/Reporting

**Complexity if built:** MEDIUM-HIGH
**Why avoid:** Two users don't need BI dashboards

| Skip | Why |
|------|-----|
| Performance metrics | No team to benchmark |
| Trend analysis | Overkill for this scale |
| Custom report builder | Weekly summary sufficient |
| Data export in multiple formats | Simple export if needed |
| Dashboard customization | Fixed views are fine |

**Keep it simple:** Weekly auto-generated report covers accountability needs.


### 7. Inventory/Parts Management

**Complexity if built:** MEDIUM
**Why avoid:** Not part of this app's scope

| Skip | Why |
|------|-----|
| Parts inventory | Handyman manages own supplies |
| Stock alerts | Not tracked in this system |
| Purchase orders | Separate concern |
| Vendor management | Out of scope |

**Source:** While [UpKeep](https://upkeep.com/maintenance-software-for/property-management/) and enterprise tools include inventory, it's unnecessary here.


### 8. Push Notifications

**Complexity if built:** MEDIUM
**Why avoid:** Explicitly deferred to later

| Skip for v1 | Why |
|-------------|-----|
| Push notifications | PROJECT.md: "spater ergänzen" |
| Email notifications | Same reasoning |
| SMS alerts | Same reasoning |

**Rationale:** Can be added later when core functionality is validated.


### 9. Offline Mode with Sync

**Complexity if built:** HIGH
**Why avoid:** Single building likely has connectivity

| Skip | Why |
|------|-----|
| Offline data storage | Connectivity assumed |
| Conflict resolution | Complex edge cases |
| Background sync | PWA complexity |
| Offline task creation | Online-only acceptable |

**Source:** [Microsoft Dynamics 365](https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2023/11/06/best-practices-for-offline-mode-in-the-field-service-mobile-app-part-1/) and others describe offline as essential for field service - but that assumes remote locations without connectivity. A 13-unit apartment building likely has WiFi/cellular.

**If needed later:** Implement as progressive enhancement, not v1 blocker.


### 10. AI-Powered Features (Beyond Transcription)

**Complexity if built:** HIGH
**Why avoid:** Overkill for scale

| Skip | Why |
|------|-----|
| AI task prioritization | Owner knows priorities |
| Predictive maintenance | Not enough data |
| Smart scheduling | One handyman, simple needs |
| Automated task creation | Manual is fine at this scale |

**Exception:** Speech-to-text transcription is planned and valuable. Keep that, skip the rest.

---

## Feature Dependencies

Understanding dependencies helps sequence development.

```
Authentication (PIN)
    └── Everything else requires knowing who the user is

Building Structure (Units/Common Areas)
    └── Graphical Building View
    └── Projects (per unit)
        └── Tasks (per project)
            └── Photo Upload
            └── Voice Notes
            └── Task Completion
                └── Weekly Reports (aggregate completed tasks)

Recurring Tasks
    └── Depends on: Task system
    └── Enables: Automated task generation

Voice Notes
    └── Audio Recording (both roles)
    └── Speech-to-Text (KEWA AG only)
        └── Depends on: External API (Whisper, etc.)
```

### Critical Path

1. **Auth** -> Must work first
2. **Building/Unit Structure** -> Foundation for organization
3. **Task CRUD** -> Core functionality
4. **Photo Upload** -> Proof of work
5. **Dashboards** -> Both user views
6. **Voice Notes** -> Enhancement (can be Phase 2)
7. **Recurring Tasks** -> Enhancement (can be Phase 2)
8. **Weekly Reports** -> Enhancement (can be Phase 2)
9. **Graphical Building View** -> Polish (can be Phase 2-3)

---

## Prioritized Feature List

Ordered by value/complexity ratio for a 2-user single-building app.

### Priority 1: Core Loop (Must Ship)

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| PIN Authentication | HIGH | LOW | Gate to everything |
| Unit/Location Structure | HIGH | LOW | Data model foundation |
| Task CRUD | HIGH | LOW | Core function |
| Task Status (open/done) | HIGH | LOW | Minimum tracking |
| Photo Upload on Completion | HIGH | LOW-MEDIUM | Proof of work |
| Basic Task List (Imeri) | HIGH | LOW | Handyman workflow |
| Basic Overview (KEWA AG) | HIGH | LOW | Owner visibility |
| Mobile-Responsive Design | HIGH | MEDIUM | Field use essential |

**Ship these first.** App is usable with just these features.


### Priority 2: Valuable Enhancements

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Project Grouping | MEDIUM | LOW | Better organization |
| Due Dates + Priority | MEDIUM | LOW | Task urgency |
| Recurring Tasks | MEDIUM | LOW-MEDIUM | Reduces manual work |
| Completion Notes | MEDIUM | LOW | Context for photos |
| Task Images (from KEWA AG) | MEDIUM | LOW | Explain visually |

**Add these in Phase 2.** Significant quality-of-life improvements.


### Priority 3: Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Voice Notes (Audio) | MEDIUM-HIGH | MEDIUM | Both roles can record |
| Speech-to-Text (KEWA AG) | MEDIUM-HIGH | MEDIUM | Auto-transcription |
| Weekly Reports | MEDIUM | MEDIUM | Automated accountability |
| Before/After Photo Display | MEDIUM | LOW | Side-by-side view |

**Add these in Phase 2-3.** Make the app special.


### Priority 4: Polish

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Graphical Building View | MEDIUM-HIGH | MEDIUM-HIGH | Visual navigation |
| Task Archive/History | LOW-MEDIUM | LOW | Long-term records |
| Audio Playback (Imeri) | MEDIUM | LOW | Listen to instructions |
| Audio Overview (KEWA AG) | LOW | LOW | Manage recordings |

**Add these in Phase 3+.** Nice to have, not blocking.

---

## Complexity Ratings Explained

| Rating | Development Time (Solo Dev) | Risk |
|--------|---------------------------|------|
| LOW | Hours to 1-2 days | Minimal |
| LOW-MEDIUM | 1-3 days | Low |
| MEDIUM | 3-5 days | Moderate |
| MEDIUM-HIGH | 1-2 weeks | Moderate |
| HIGH | 2+ weeks | Significant |

**Context:** For a Next.js + Supabase stack with an experienced developer.

---

## Sources

### Primary (HIGH confidence)
- [Buildium](https://www.buildium.com/features/maintenance-request-management/) - Property maintenance features
- [Jobber](https://www.getjobber.com/industries/handyman-invoice-software/) - Handyman software features
- [UpKeep](https://upkeep.com/maintenance-software-for/property-management/) - Work order management
- [MaintainX](https://www.getmaintainx.com/industries/property-management) - Recurring maintenance

### Secondary (MEDIUM confidence)
- [DoorLoop](https://www.doorloop.com/blog/property-management-report) - Property management reports
- [FieldProMax](https://www.fieldpromax.com/blog/top-5-features-in-the-field-service-software) - FSM essential features
- [CompanyCam](https://companycam.com/advanced-features/before-after-photos) - Photo documentation
- [Fulcrum](https://www.fulcrumapp.com/blog/audio-fastfill-field-data-capture-using-voice-dictation/) - Voice dictation field service

### Tertiary (LOW confidence - general patterns)
- [Landlord Studio](https://www.landlordstudio.com/) - Small landlord tools
- [TurboTenant](https://www.turbotenant.com/) - Simple property management
- [Microsoft Dynamics 365](https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2023/11/06/best-practices-for-offline-mode-in-the-field-service-mobile-app-part-1/) - Offline mode patterns

---

## Metadata

**Confidence breakdown:**
- Table stakes features: HIGH - Consistent across all sources
- Differentiators: MEDIUM-HIGH - Based on market gap analysis
- Anti-features: HIGH - Clear enterprise vs simple app distinction
- Complexity ratings: MEDIUM - Estimates based on typical development, may vary

**Research date:** 2025-01-16
**Valid until:** 2025-03-16 (feature sets stable, 60-day relevance)
