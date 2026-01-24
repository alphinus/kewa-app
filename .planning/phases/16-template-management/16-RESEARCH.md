# Phase 16: Template-Management - Research

**Researched:** 2026-01-24
**Domain:** Next.js 16 + React 19 Admin UI for WBS Template Hierarchy CRUD
**Confidence:** HIGH

## Summary

Phase 16 builds a management UI for the existing template system (Phase 08). The backend is complete with full CRUD APIs for templates, phases, packages, tasks, dependencies, and quality gates. The focus is on creating an admin-only interface for managing the 3-level WBS hierarchy (Phase → Package → Task) with inline editing, drag-and-drop reordering, and project creation integration.

The codebase follows a custom component pattern (no shadcn/Radix) with manual validation matching existing forms (PartnerForm, UnitForm patterns). Template APIs are fully functional with comprehensive type definitions and client-side utility functions for template application and metrics calculation.

**Primary recommendation:** Build inline accordion editor with expandable sections for hierarchy navigation, use existing Card/Button/Input components, follow PartnerForm modal pattern for creation/editing, implement custom drag-and-drop with HTML5 Drag API (no third-party libraries), and integrate template selection into project creation flow with side-by-side preview.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.2 | App Router framework | Current major version, established project standard |
| React | 19.2.3 | UI framework | Latest stable, matches Next.js 16 |
| TypeScript | ^5 | Type safety | Project standard, comprehensive type definitions exist |
| Tailwind CSS | ^4 | Styling | Project standard, all components use utility classes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting | Timeline displays, audit metadata |
| clsx | ^2.1.1 | Conditional classes | Already used throughout codebase |
| lucide-react | ^0.562.0 | Icons | Existing icon library for UI elements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML5 Drag API | @dnd-kit/core | Project has no drag-drop library; HTML5 API sufficient for single-list reordering within accordion sections |
| Custom accordion | Radix/HeadlessUI | Project uses zero external UI libraries; custom solution maintains consistency |
| Manual validation | Zod | Existing codebase pattern (expenses, invoices, partners) uses manual validation for consistency |

**Installation:**
```bash
# No new dependencies required
# All necessary libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── dashboard/
│       └── templates/
│           ├── page.tsx                    # List page with category grouping
│           ├── [id]/
│           │   ├── page.tsx               # Detail page (Summary + Structure tabs)
│           │   └── edit/
│           │       └── page.tsx           # Edit page with hierarchy accordion
│           └── new/
│               └── page.tsx               # Create template page
├── components/
│   └── templates/
│       ├── TemplateCard.tsx               # EXISTING: List card component
│       ├── TemplateList.tsx               # NEW: Grouped list with filters
│       ├── TemplateForm.tsx               # NEW: Create/edit template metadata
│       ├── HierarchyEditor.tsx            # NEW: Accordion with drag-drop
│       ├── PhaseAccordion.tsx             # NEW: Expandable phase section
│       ├── PackageAccordion.tsx           # NEW: Expandable package section
│       ├── TaskRow.tsx                    # NEW: Inline expandable task
│       ├── DependencyIndicator.tsx        # NEW: Inline dependency badge
│       ├── QualityGateIndicator.tsx       # NEW: Inline gate badge
│       ├── TemplatePreview.tsx            # NEW: Side-by-side preview for project creation
│       └── TemplateDuplicateModal.tsx     # NEW: Duplicate template with options
└── lib/
    └── templates/
        ├── apply.ts                       # EXISTING: Client utilities
        └── dependencies.ts                # EXISTING: Circular detection
```

### Pattern 1: Accordion Hierarchy Navigation
**What:** Three-level expandable accordion (Phase expands to Packages, Package expands to Tasks)
**When to use:** Template detail and edit views
**Example:**
```typescript
// Source: Inferred from UnitTimeline expandable pattern + CONTEXT.md decisions
interface HierarchyEditorProps {
  template: TemplateWithHierarchy
  readonly?: boolean
  onUpdate?: (template: TemplateWithHierarchy) => void
}

export function HierarchyEditor({ template, readonly, onUpdate }: HierarchyEditorProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {template.phases.map(phase => (
        <PhaseAccordion
          key={phase.id}
          phase={phase}
          expanded={expandedPhases.has(phase.id)}
          onToggle={() => togglePhase(phase.id)}
          expandedPackages={expandedPackages}
          onPackageToggle={(pkgId) => {/* similar pattern */}}
          expandedTasks={expandedTasks}
          onTaskToggle={(taskId) => {/* similar pattern */}}
          readonly={readonly}
        />
      ))}
    </div>
  )
}
```

### Pattern 2: Inline Task Editing
**What:** Click task row to expand inline edit form (no modal)
**When to use:** Task editing within hierarchy editor
**Example:**
```typescript
// Source: UnitTimeline expandable details pattern
interface TaskRowProps {
  task: TemplateTask
  expanded: boolean
  onToggle: () => void
  onSave: (task: TemplateTask) => void
  readonly?: boolean
}

export function TaskRow({ task, expanded, onToggle, onSave, readonly }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(task)

  if (expanded && editing && !readonly) {
    return (
      <div className="border-l-2 border-blue-500 pl-4 py-2 bg-blue-50">
        {/* Inline edit form */}
        <Input label="Name" value={formData.name} onChange={...} />
        <div className="flex gap-2 mt-2">
          <Button onClick={() => { onSave(formData); setEditing(false) }}>Save</Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
      <span>{task.wbs_code} {task.name}</span>
      {/* Inline indicators */}
    </div>
  )
}
```

### Pattern 3: Drag-and-Drop Reordering
**What:** HTML5 Drag API for reordering within each hierarchy level
**When to use:** Hierarchy editor in edit mode
**Example:**
```typescript
// Source: Custom implementation based on HTML5 Drag API
const handleDragStart = (e: React.DragEvent, index: number) => {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', index.toString())
}

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
  e.preventDefault()
  const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))

  if (dragIndex === dropIndex) return

  // Reorder items and update sort_order
  const reordered = [...items]
  const [removed] = reordered.splice(dragIndex, 1)
  reordered.splice(dropIndex, 0, removed)

  // Update sort_order for affected items
  await updateSortOrders(reordered)
}

return (
  <div
    draggable
    onDragStart={(e) => handleDragStart(e, index)}
    onDragOver={handleDragOver}
    onDrop={(e) => handleDrop(e, index)}
    className="cursor-move"
  >
    {/* Item content */}
  </div>
)
```

### Pattern 4: Template Selection in Project Creation
**What:** Template-first project creation with side-by-side preview
**When to use:** Project creation flow (Phase 16 requirement TMPL-05)
**Example:**
```typescript
// Source: CONTEXT.md decision + existing project creation pattern
interface ProjectCreateWithTemplateProps {
  buildingId: string
  unitId: string
}

export function ProjectCreateWithTemplate({ buildingId, unitId }: ProjectCreateWithTemplateProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithHierarchy | null>(null)
  const [excludedTasks, setExcludedTasks] = useState<Set<string>>(new Set())

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Template selector */}
      <div>
        <h2>Template wählen</h2>
        <TemplateList onSelect={setSelectedTemplate} />
      </div>

      {/* Right: Preview with customization */}
      <div>
        {selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            excludedTasks={excludedTasks}
            onToggleTask={(taskId) => {
              setExcludedTasks(prev => {
                const next = new Set(prev)
                next.has(taskId) ? next.delete(taskId) : next.add(taskId)
                return next
              })
            }}
          />
        )}
        <Button onClick={() => applyTemplate(selectedTemplate, excludedTasks)}>
          Projekt erstellen
        </Button>
      </div>
    </div>
  )
}
```

### Pattern 5: Category Grouping in List View
**What:** Group templates by category with collapsible sections
**When to use:** Template list page
**Example:**
```typescript
// Source: CONTEXT.md decision + existing card patterns
interface TemplateListProps {
  onSelect?: (template: TemplateWithHierarchy) => void
}

export function TemplateList({ onSelect }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showInactive, setShowInactive] = useState(false)

  // Group by category
  const grouped = templates.reduce((acc, t) => {
    if (!showInactive && !t.is_active) return acc
    acc[t.category] = acc[t.category] || []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, Template[]>)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <h2 className="text-lg font-semibold mb-3">
            {categoryLabels[category]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(template => (
              <TemplateCard key={template.id} template={template} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Delete with CASCADE without confirmation:** Template deletion cascades to phases/packages/tasks. Must require explicit confirmation with item count display
- **Mutating hierarchy state directly:** Always use immutable updates for nested accordion state
- **Drag-drop without visual feedback:** Must show drop zones and drag preview during drag operation
- **Loading entire hierarchy for list view:** Use templates table only for list, fetch hierarchy on detail view
- **Allowing delete of non-leaf nodes:** Block deletion of phases/packages with children (CONTEXT.md decision)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular dependency detection | Graph traversal algorithm | `src/lib/templates/dependencies.ts` detectCircularDependency | Already implemented in codebase, used by POST /api/templates/[id]/dependencies |
| Template metrics calculation | Manual aggregation | `src/lib/templates/apply.ts` calculateTemplateMetrics | Handles excluded tasks, null costs, proper summation |
| WBS code generation | Custom numbering | Database sort_order + client-side formatting | sort_order already tracked in DB, WBS codes stored as TEXT for flexibility |
| Nested hierarchy state | Custom state manager | React useState with Set<string> for expanded IDs | Simple, performant, matches existing UnitTimeline pattern |
| Form validation | Custom validator class | Inline validation functions (manual pattern) | Matches existing PartnerForm, ExpenseForm, InvoiceForm patterns for consistency |

**Key insight:** Template system backend is production-ready with comprehensive APIs, type definitions, and utilities. Don't rebuild what exists—focus on UI layer that consumes existing infrastructure.

## Common Pitfalls

### Pitfall 1: Accordion State Explosion
**What goes wrong:** Managing expanded state for hundreds of nested items causes performance issues
**Why it happens:** Naive approach stores full hierarchy path or creates nested state objects
**How to avoid:** Use Set<string> for expanded IDs only (not full objects), memoize accordion components
**Warning signs:** Sluggish accordion toggle, re-renders on unrelated actions

### Pitfall 2: Delete Without Cascade Awareness
**What goes wrong:** User deletes phase without understanding all packages/tasks will be deleted
**Why it happens:** Database CASCADE deletes are invisible to user
**How to avoid:** Fetch child counts before delete confirmation, display "This will delete X packages and Y tasks"
**Warning signs:** Support requests about missing data after deletion

### Pitfall 3: Drag-Drop Within Wrong Level
**What goes wrong:** Dragging package into different phase, or task into different package
**Why it happens:** Drop zones not properly scoped to current parent
**How to avoid:** Restrict drop targets to same parent level, validate parent_id hasn't changed
**Warning signs:** WBS codes out of order, orphaned items in wrong hierarchy level

### Pitfall 4: Race Conditions on Rapid Edits
**What goes wrong:** Multiple inline edits in hierarchy cause conflicts when saving
**Why it happens:** No optimistic locking or debouncing on save
**How to avoid:** Disable editing on other items when one is open, use optimistic updates with rollback
**Warning signs:** Lost edits, duplicate items, inconsistent state after rapid clicks

### Pitfall 5: Template Preview Performance
**What goes wrong:** Side-by-side preview in project creation is slow with large templates
**Why it happens:** Rendering full hierarchy tree with all tasks on every excluded task toggle
**How to avoid:** Memoize TemplatePreview, use virtual scrolling for large task lists, lazy-load collapsed sections
**Warning signs:** UI freeze when toggling optional tasks, slow template selection

### Pitfall 6: WBS Code Synchronization
**What goes wrong:** WBS codes (e.g., "1.1.1") don't update when items are reordered
**Why it happens:** WBS codes stored as TEXT but generated from position in hierarchy
**How to avoid:** WBS codes are STORED in database, not computed. When reordering, must update WBS codes of affected items to maintain consistency
**Warning signs:** WBS codes like "1.1.3" appearing before "1.1.1" after drag-drop

## Code Examples

Verified patterns from codebase and API documentation:

### Fetch Template with Hierarchy
```typescript
// Source: src/app/api/templates/[id]/route.ts GET handler
async function fetchTemplateHierarchy(templateId: string): Promise<TemplateWithHierarchy> {
  const response = await fetch(`/api/templates/${templateId}`)
  if (!response.ok) throw new Error('Failed to fetch template')
  const data = await response.json()
  return data.template
}

// Returns nested structure:
// {
//   ...template,
//   phases: [
//     {
//       ...phase,
//       packages: [
//         {
//           ...package,
//           tasks: [...]
//         }
//       ]
//     }
//   ],
//   dependencies: [...],
//   quality_gates: [...]
// }
```

### Create Template Phase
```typescript
// Source: src/app/api/templates/[id]/phases/route.ts POST handler
async function createPhase(templateId: string, input: CreateTemplatePhaseInput) {
  const response = await fetch(`/api/templates/${templateId}/phases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      wbs_code: input.wbs_code,
      sort_order: input.sort_order // Optional: auto-increments if not provided
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json() // { phase: TemplatePhase }
}
```

### Update Task with Dependencies Check
```typescript
// Source: src/app/api/templates/[id]/dependencies/route.ts POST handler
async function createDependency(
  templateId: string,
  predecessorTaskId: string,
  successorTaskId: string
) {
  const response = await fetch(`/api/templates/${templateId}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      predecessor_task_id: predecessorTaskId,
      successor_task_id: successorTaskId,
      dependency_type: 'FS', // Default: Finish-to-Start
      lag_days: 0
    })
  })

  if (!response.ok) {
    const error = await response.json()
    if (error.cycle) {
      // Circular dependency detected
      throw new Error(`Circular dependency: ${error.cycle.join(' → ')}`)
    }
    throw new Error(error.error)
  }

  return await response.json() // { dependency: TemplateDependency }
}
```

### Inline Edit Form Validation
```typescript
// Source: src/components/partners/PartnerForm.tsx validation pattern
function validateTaskForm(task: Partial<TemplateTask>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!task.name?.trim()) {
    errors.name = 'Name ist erforderlich'
  }

  if (!task.wbs_code?.trim()) {
    errors.wbs_code = 'WBS-Code ist erforderlich'
  }

  if (task.estimated_duration_days === undefined || task.estimated_duration_days < 1) {
    errors.estimated_duration_days = 'Dauer muss mindestens 1 Tag sein'
  }

  if (task.estimated_cost !== undefined && task.estimated_cost < 0) {
    errors.estimated_cost = 'Kosten dürfen nicht negativ sein'
  }

  return errors
}

// Usage in form component
const [errors, setErrors] = useState<Record<string, string>>({})

const handleSave = () => {
  const validationErrors = validateTaskForm(formData)
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors)
    return
  }

  onSave(formData)
}
```

### Apply Template to Project
```typescript
// Source: src/lib/templates/apply.ts
import { applyTemplateToProject, calculateTemplateMetrics } from '@/lib/templates/apply'

async function createProjectFromTemplate(
  templateId: string,
  projectId: string,
  excludedTaskIds: string[]
) {
  const result = await applyTemplateToProject({
    templateId,
    projectId,
    startDate: new Date(),
    excludedTaskIds
  })

  // Returns: {
  //   success: true,
  //   template_id: string,
  //   template_name: string,
  //   project_id: string,
  //   phases_created: number,
  //   packages_created: number,
  //   tasks_created: number,
  //   dependencies_created: number,
  //   gates_created: number
  // }

  return result
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal forms for all edits | Inline expansion for task editing | Phase 16 design | Reduces modal fatigue, keeps context visible |
| Flat task lists | 3-level WBS accordion | Phase 08 schema | Mirrors professional project management structure |
| Static templates | Customizable before apply | Phase 16 design | Allows per-project adjustments without template pollution |
| Manual task creation | Template-based project creation | Phase 08 + 16 | Reduces setup time from hours to minutes |

**Deprecated/outdated:**
- None (template system is new in Phase 08, Phase 16 is first UI implementation)

## Open Questions

1. **WBS Code Regeneration on Reorder**
   - What we know: WBS codes stored as TEXT in database (e.g., "1.1.1"), sort_order tracks position
   - What's unclear: Should WBS codes auto-regenerate on reorder, or remain fixed as stored?
   - Recommendation: Make WBS codes editable fields (user controls), use sort_order for display order. Warn if WBS code doesn't match position but don't auto-fix.

2. **Duplicate Template Depth**
   - What we know: CONTEXT.md mentions "Duplicate" action in list view
   - What's unclear: Should duplicate copy dependencies, quality gates, or just hierarchy?
   - Recommendation: Duplicate everything by default (full deep copy), provide checkbox options to exclude dependencies/gates

3. **Template Versioning**
   - What we know: Out of scope for Phase 16 per CONTEXT.md
   - What's unclear: Should edited templates affect existing projects created from them?
   - Recommendation: No versioning in Phase 16. Templates and projects are independent after creation (projects have source_template_phase_id links but are autonomous)

4. **Dependency Visualization**
   - What we know: CONTEXT.md explicitly excludes graph visualization, only inline indicators
   - What's unclear: What should inline indicators show? Just count, or preview of linked tasks?
   - Recommendation: Show dependency count badge (e.g., "2 deps") with tooltip listing linked task names on hover

## Sources

### Primary (HIGH confidence)
- `/src/app/api/templates/**/*.ts` - Complete CRUD API implementation for all template entities
- `/src/types/templates.ts` - Comprehensive TypeScript definitions for template system
- `/src/lib/templates/apply.ts` - Client-side utilities for template application and metrics
- `/src/lib/templates/dependencies.ts` - Circular dependency detection algorithm
- `/supabase/migrations/032_templates.sql` - Database schema with WBS hierarchy tables
- `/src/components/partners/PartnerForm.tsx` - Reference implementation for modal form pattern
- `/src/components/units/UnitTimeline.tsx` - Reference implementation for expandable accordion pattern
- `/src/components/templates/TemplateCard.tsx` - Existing template list card component
- `.planning/phases/16-template-management/16-CONTEXT.md` - User decisions and design constraints

### Secondary (MEDIUM confidence)
- Next.js 16 documentation - App Router patterns, React 19 compatibility
- Tailwind CSS 4 documentation - Utility class patterns

### Tertiary (LOW confidence)
- None (all findings verified against existing codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in package.json, versions confirmed
- Architecture: HIGH - Patterns extracted from existing components (PartnerForm, UnitTimeline, TemplateCard)
- Pitfalls: MEDIUM - Inferred from similar features (accordion state, inline editing) but not template-specific production experience
- Code examples: HIGH - All examples taken directly from existing API routes and components

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain, minimal churn expected in Next.js 16/React 19)
