# Phase 9: External Contractor Portal - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

External contractors can receive work orders via magic link, view all their orders in a dashboard, accept/reject/counter-offer, and upload evidence of completed work. Communication happens externally (phone/email). PDF generation and email sending are part of this phase.

</domain>

<decisions>
## Implementation Decisions

### Magic Link Experience
- Link leads to **dashboard showing all contractor's work orders** (not single work order)
- Link validity: **Until work order is complete** (contractor can bookmark)
- Expired/completed link: Show **"Request new link" form** (email input, sends fresh magic link)
- Email content: **KEWA chooses per work order** whether to attach PDF or just include link

### Portal Interface
- Info exposed: **Work-relevant only** — address, unit number, room(s), access instructions, site contact
- Dashboard layout: **Card per work order** showing status at a glance
- Status display: **Action needed** focus ("Pending your response", "Upload required", "Overdue")
- History: **Separate section** for completed work orders (dashboard focused on active)

### Response Actions
- Rejection: **Reason required** — select from list (capacity, location, scope, other) + optional comment
- Counter-offer: **Supported** — contractor can propose different price, KEWA approves/rejects
- After counter-offer rejected: **KEWA chooses** — can close the order or send back to contractor
- Messaging: **No in-app messaging** — contact info shown, communication via phone/email

### Progress & Evidence
- Uploads: **Flexible** — any combination of photos, documents, videos; nothing strictly required
- Completion: **"Mark complete" button** — contractor signals done, KEWA reviews
- Evidence requests: **Contractor decides** what to upload (no KEWA requests in portal)
- Deadlines: **Shown but no automated reminders** — KEWA follows up manually if needed

### Claude's Discretion
- Card design and visual styling
- Mobile responsiveness approach
- Form validation patterns
- Loading states and error handling
- PDF layout and branding

</decisions>

<specifics>
## Specific Ideas

- Dashboard should feel action-oriented — contractors open it to see "what do I need to do?"
- Cards should clearly distinguish "needs my action" from "waiting on KEWA"
- Counter-offer flow should feel like negotiation, not confrontation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-external-contractor-portal*
*Context gathered: 2026-01-18*
