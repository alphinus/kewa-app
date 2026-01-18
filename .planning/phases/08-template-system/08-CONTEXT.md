# Phase 8: Template System - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Wiederverwendbare Renovations-Vorlagen mit hierarchischer WBS-Struktur (Phasen → Pakete → Tasks). Templates können Abhängigkeiten zwischen Tasks definieren, Quality Gates mit Evidenz-Anforderungen festlegen, und auf neue Projekte angewendet werden. Das Template-System dient als Basis für standardisierte Renovations-Workflows.

</domain>

<decisions>
## Implementation Decisions

### Template Structure
- **3-level hierarchy:** Phase → Package → Task (as specified in requirements)
- **Scope types:** Both room-specific templates (e.g., "Badezimmer komplett") AND generic templates (e.g., "Malerarbeiten" works anywhere)
- **Rich metadata:** Name, description, estimated duration, trade/Gewerk, cost estimate, materials, notes
- **Admin-only management:** Only admins can create/edit templates
- **No versioning:** Templates edited in place, projects keep their applied copy
- **Starter library:** Seed with 3 templates (Komplett-Renovation, Bad, Küche)
- **Category organization:** Group by type (Komplett, Raum-spezifisch, Gewerk-spezifisch)
- **Calculated duration:** Template duration computed from task durations (respecting dependency overlap)
- **Full cloning:** Can duplicate entire template with all phases/packages/tasks
- **Optional tasks:** Individual tasks can be marked as optional (toggle during application)
- **Gantt-style preview:** Timeline view showing sequence and dependencies
- **Trade type optional:** Tasks can specify which trade handles them, but not required
- **Attachments at all levels:** Phases, packages, and tasks can have reference documents/images

### Dependency Model
- **Multiple dependency types:** FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF
- **Cross-level dependencies:** Dependencies can link any task to any task across packages and phases
- **Display only:** Dependencies shown visually but not enforced (no blocking)

### Claude's Discretion
- Circular dependency handling (prevent vs warn)

### Template Application
- **Full copy:** Creates independent copies of all tasks — no link back to template
- **New projects only:** Templates can only be applied to fresh/empty projects
- **Full preview:** See all tasks, toggle optional ones, adjust estimates before applying
- **Stack templates:** Multiple templates can be combined on one project (e.g., "Bad" + "Küche")

### Quality Gates
- **Both levels:** Gates at package AND phase boundaries
- **Checklist + Photos:** Must complete checklist items AND upload photos to pass gate
- **Auto-approve:** Gate passes automatically when all evidence requirements met

### Claude's Discretion
- Quality Gate blocking behavior (hard vs soft blocking)

</decisions>

<specifics>
## Specific Ideas

- Gantt-style visualization preferred for understanding task sequences and dependencies
- Template library should be ready-to-use from day one with 3 seed templates
- Stacking templates allows combining "Bad" + "Küche" for multi-room renovations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-template-system*
*Context gathered: 2026-01-18*
