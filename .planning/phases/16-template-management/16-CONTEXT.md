# Phase 16: Template-Management — Context

## Phase Goal

Admin can view, create, and edit project templates through the UI.

## Background

Template APIs exist (GET/POST/PATCH/DELETE for templates, phases, packages, tasks, dependencies, quality gates). This phase builds the management UI for the 3-level WBS hierarchy.

## Decisions

### 1. Template List Layout

| Decision | Choice |
|----------|--------|
| Organization | Grouped by category (Bad, Küche, Allgemein sections) |
| Visible fields | Rich: name, category, scope, phase count, duration, cost estimate |
| List actions | View + Edit + Duplicate buttons inline |
| Inactive templates | Hidden by default, toggle to show |

**Rationale:** Grouping by category matches how KEWA thinks about renovations. Rich info reduces clicks for common decisions. Duplicate enables creating template variants.

### 2. Hierarchy Editor (Phase → Package → Task)

| Decision | Choice |
|----------|--------|
| Tree layout | Expandable accordion (phases expand to packages, packages to tasks) |
| Add items | '+' button at each level |
| Reordering | Drag and drop within level |
| Delete with children | Block — must delete children first |

**Rationale:** Accordion keeps focus on active section. Block-delete prevents accidental cascade destruction of template content.

### 3. Template Detail View

| Decision | Choice |
|----------|--------|
| Page layout | Two tabs: Summary, Structure |
| Task editing | Inline expand (click task row expands to form) |
| Dependencies | Inline indicators on tasks in tree |
| Quality gates | Inline indicators at phase/package level in tree |

**Rationale:** Tabs separate overview from editing. Inline expand keeps context visible. Dependencies and gates shown in tree to understand structure at a glance.

### 4. Project Creation Flow

| Decision | Choice |
|----------|--------|
| Selection point | First step — choose template before project details |
| Preview | Side-by-side preview of selected template structure |
| Customization | Full preview/edit — show structure, allow changes before apply |
| Apply behavior | New projects only — templates not applicable to existing projects |

**Rationale:** Template-first mirrors KEWA workflow (renovation type determines structure). Full customization allows per-project adjustments without polluting master templates.

## Scope Boundaries

**In scope:**
- Template CRUD with hierarchy editor
- List page with category grouping
- Detail page with summary/structure tabs
- Inline dependency/gate indicators
- Project creation template selection with preview
- Template customization before apply

**Out of scope:**
- Dependency graph visualization (use inline indicators only)
- Quality gate workflow editing (indicators only, full gate editing future phase)
- Bulk import/export of templates
- Template versioning

## UI Patterns to Follow

Based on existing codebase:
- Use existing card components for list items
- Follow modal patterns from PartnerForm, UnitForm
- Accordion pattern similar to existing expandable sections
- Tab pattern from existing detail pages

## Technical Notes

- APIs exist: `/api/templates/*`
- Types defined: `src/types/templates.ts`
- Template apply logic: `src/lib/templates/apply.ts`
