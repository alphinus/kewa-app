# Phase 18: Knowledge Base — Context

## Phase Goal
Users can create, organize, and search internal documentation and contractor-visible FAQs.

## Decisions

### Article Structure & Editing

| Decision | Choice |
|----------|--------|
| Content editor | WYSIWYG rich text editor |
| Article structure | Templated — predefined sections based on type |
| Templates available | FAQ, How-to, Policy |
| Metadata captured | Extended: title, category, tags, author, last-reviewed date, expiry date, related articles |
| Attachments | Images embedded in content + file attachments (PDFs, docs) for download |
| Ownership model | Single author per article |
| Publishing workflow | Draft → Review → Published (requires approval before going live) |
| Related articles | Fully automatic (system determines algorithmically) |

### Category Organization

| Decision | Choice |
|----------|--------|
| Hierarchy depth | Two levels (categories with subcategories) |
| Multi-category | Single category only — each article in exactly one category |
| Navigation UI | Collapsible sidebar tree |
| Category management | Admins only |
| Empty categories | Admin sees all, users see only populated categories |
| Category metadata | Name + description + icon |
| Default bucket | "Uncategorized" allowed — articles without category go to General |
| Article ordering | Most recent first (by last updated) |

### Contractor Content Experience

| Decision | Choice |
|----------|--------|
| Access point | Both dedicated KB section in portal AND contextual inline display |
| Category structure | Same tree as internal, filtered to contractor-visible articles |
| Search capability | Full search (same as internal, filtered to visible articles) |
| Metadata shown | Content only — no author, dates, or internal metadata |
| Contextual trigger | Category matching — articles in related category appear on relevant pages |
| Feedback mechanism | None — read-only, no interaction |
| Contractor-exclusive | No — all articles exist internally, some marked contractor-visible |
| Visibility setting | Explicit audience selection: Internal only, Contractors, or Both |

### Search Behavior

| Decision | Choice |
|----------|--------|
| Search trigger | Hybrid — quick suggestions while typing, full results on submit |
| Search scope | Everything — title, content, tags, attachment names, category names |
| Results display | Title + snippet (excerpt with match context) + metadata (category, last updated) |
| Match highlighting | Everywhere — in title, snippet, and when viewing full article |
| Filters | Multiple filters: category, date range, audience, author |
| Empty state | Show spelling suggestions or related terms |
| Search history | None — fresh search box each time |
| Search placement | Both — prominent on KB page, also accessible globally via header |

## Constraints

- Article templates are fixed (FAQ, How-to, Policy) — not user-definable
- Two-level category max — no deeper nesting
- Single category per article — no cross-categorization
- Approval workflow is mandatory for publishing
- Contractors cannot interact with articles (no feedback, no comments)

## Out of Scope (Deferred)

None captured during discussion.

---
*Generated: 2026-01-25*
*Source: discuss-phase session*
