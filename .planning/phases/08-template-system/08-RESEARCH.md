# Phase 8: Template System - Research

**Researched:** 2026-01-18
**Domain:** WBS Template System with Gantt Visualization
**Confidence:** HIGH (verified with PostgreSQL docs, established patterns, and existing codebase analysis)

## Summary

The Template System implements a Work Breakdown Structure (WBS) for renovation workflows with a 3-level hierarchy: Template Phase > Template Package > Template Task. Templates are fully cloned when applied to projects (no live link), and include task dependencies with four standard types (FS, SS, FF, SF) and Quality Gates at package and phase boundaries.

The database schema extends the existing data model with 6 new tables for templates and their components. A PostgreSQL function handles deep cloning with ID remapping for dependencies. The Gantt visualization can use the open-source SVAR React Gantt (MIT license) which supports dependencies and is React 19 compatible.

**Primary recommendation:** Use a dedicated template schema separate from runtime tasks, with a PostgreSQL function for atomic template application that deep-clones all hierarchy levels while remapping dependency IDs.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SVAR React Gantt | 2.4+ | Gantt timeline visualization | MIT license, React 19 compatible, TypeScript, dependencies support |
| PostgreSQL | 15+ | WBS storage and cloning | Native recursive CTEs, JSONB, stored procedures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| topsort | 3.0+ | Topological sort | Circular dependency detection in JS |
| date-fns | 3.x | Date calculations | Timeline calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVAR Gantt | gantt-task-react | Last update 3 years ago, less maintained |
| SVAR Gantt | Syncfusion/DHTMLX | Commercial licensing ($599-899+/dev) |
| PostgreSQL function | Application-level copy | Less atomic, more network trips, race conditions |

**Installation:**
```bash
npm install @svar/react-gantt topsort date-fns
```

## Database Schema Design

### Template Tables (6 new tables)

```sql
-- =============================================
-- TEMPLATE CATEGORY (for organizing templates)
-- =============================================
CREATE TYPE template_category AS ENUM (
  'complete_renovation',    -- Komplett-Renovation
  'room_specific',          -- Raum-spezifisch (Bad, Kueche, etc.)
  'trade_specific'          -- Gewerk-spezifisch (Malerarbeiten, etc.)
);

CREATE TYPE template_scope AS ENUM (
  'unit',      -- Applies to entire unit
  'room'       -- Applies to specific room type
);

-- =============================================
-- TEMPLATES (root entity)
-- =============================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  scope template_scope NOT NULL,

  -- For room-scoped templates
  target_room_type room_type,

  -- Calculated fields (updated by trigger)
  total_duration_days INTEGER,
  total_estimated_cost DECIMAL(12,2),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEMPLATE PHASES (level 1 of WBS)
-- =============================================
CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1", "2", "3")
  wbs_code TEXT NOT NULL,

  -- Scheduling (calculated from packages/tasks)
  estimated_duration_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, wbs_code)
);

-- =============================================
-- TEMPLATE PACKAGES (level 2 of WBS)
-- =============================================
CREATE TABLE template_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1", "1.2", "2.1")
  wbs_code TEXT NOT NULL,

  -- Trade association (optional)
  trade_category trade_category,

  -- Scheduling (calculated from tasks)
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, wbs_code)
);

-- =============================================
-- TEMPLATE TASKS (level 3 of WBS - work packages)
-- =============================================
CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1.1", "1.1.2")
  wbs_code TEXT NOT NULL,

  -- Scheduling
  estimated_duration_days INTEGER NOT NULL DEFAULT 1,
  estimated_cost DECIMAL(10,2),

  -- Trade association
  trade_category trade_category,

  -- Task attributes
  is_optional BOOLEAN DEFAULT false,
  materials_list JSONB DEFAULT '[]'::JSONB,
  notes TEXT,

  -- Checklist template (copied to task on application)
  checklist_template JSONB DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(package_id, wbs_code)
);

-- =============================================
-- TEMPLATE DEPENDENCIES
-- =============================================
CREATE TYPE dependency_type AS ENUM ('FS', 'SS', 'FF', 'SF');

CREATE TABLE template_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Dependencies link tasks (across any package/phase)
  predecessor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type dependency_type NOT NULL DEFAULT 'FS',

  -- Lag time (days)
  lag_days INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dependencies
  UNIQUE(predecessor_task_id, successor_task_id),

  -- Prevent self-reference
  CHECK(predecessor_task_id != successor_task_id)
);

-- =============================================
-- QUALITY GATES
-- =============================================
CREATE TYPE gate_level AS ENUM ('package', 'phase');

CREATE TABLE template_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Gate location
  gate_level gate_level NOT NULL,
  phase_id UUID REFERENCES template_phases(id) ON DELETE CASCADE,
  package_id UUID REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Gate definition
  name TEXT NOT NULL,
  description TEXT,

  -- Evidence requirements
  checklist_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Structure: [{"id": "uuid", "text": "Item beschreiben", "required": true}]

  min_photos_required INTEGER DEFAULT 0,
  photo_types JSONB DEFAULT '["completion"]'::JSONB,
  -- Structure: ["completion", "detail", "overview"]

  -- Behavior
  is_blocking BOOLEAN DEFAULT true,
  auto_approve_when_complete BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure gate is linked to exactly one entity
  CHECK(
    (gate_level = 'package' AND package_id IS NOT NULL AND phase_id IS NULL) OR
    (gate_level = 'phase' AND phase_id IS NOT NULL AND package_id IS NULL)
  )
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_scope ON templates(scope);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_template_phases_template ON template_phases(template_id);
CREATE INDEX idx_template_packages_phase ON template_packages(phase_id);
CREATE INDEX idx_template_tasks_package ON template_tasks(package_id);
CREATE INDEX idx_template_dependencies_template ON template_dependencies(template_id);
CREATE INDEX idx_template_dependencies_predecessor ON template_dependencies(predecessor_task_id);
CREATE INDEX idx_template_dependencies_successor ON template_dependencies(successor_task_id);
CREATE INDEX idx_template_quality_gates_template ON template_quality_gates(template_id);
```

### Schema Rationale

**Separate template tables (not reusing tasks table):**
- Templates are definitional, tasks are operational
- Different lifecycle (templates rarely change, tasks constantly updated)
- Clean separation prevents accidental mixing
- Simpler RLS policies (templates admin-only, tasks project-based)

**WBS codes:**
- Human-readable identifiers (1.2.3 format)
- Unique per level (enforced by unique constraint)
- Useful for display and reference

**JSONB for checklists and materials:**
- Flexible structure without additional tables
- Good performance with GIN indexes if needed
- Easy to clone during template application

## WBS Hierarchy Implementation

### Hierarchical Query Pattern

Fetch complete template with all levels using Supabase nested select:

```typescript
// Fetch template with full hierarchy
const { data: template } = await supabase
  .from('templates')
  .select(`
    id, name, description, category, scope, target_room_type,
    total_duration_days, total_estimated_cost,
    phases:template_phases (
      id, name, description, wbs_code, sort_order, estimated_duration_days,
      packages:template_packages (
        id, name, description, wbs_code, sort_order,
        trade_category, estimated_duration_days, estimated_cost,
        tasks:template_tasks (
          id, name, description, wbs_code, sort_order,
          estimated_duration_days, estimated_cost, trade_category,
          is_optional, materials_list, notes, checklist_template
        )
      )
    ),
    dependencies:template_dependencies (
      id, predecessor_task_id, successor_task_id, dependency_type, lag_days
    ),
    quality_gates:template_quality_gates (
      id, gate_level, phase_id, package_id, name, description,
      checklist_items, min_photos_required, photo_types,
      is_blocking, auto_approve_when_complete
    )
  `)
  .eq('id', templateId)
  .order('sort_order', { foreignTable: 'template_phases' })
  .single();
```

### Duration Calculation Trigger

Calculate template duration from task durations (respecting parallel execution via dependencies):

```sql
-- Simplified: sum of all tasks (dependencies handled at application time)
CREATE OR REPLACE FUNCTION calculate_template_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update package duration
  UPDATE template_packages p
  SET estimated_duration_days = (
    SELECT COALESCE(MAX(estimated_duration_days), 0)
    FROM template_tasks t
    WHERE t.package_id = p.id
  )
  WHERE p.id = COALESCE(NEW.package_id, OLD.package_id);

  -- Update phase duration
  UPDATE template_phases ph
  SET estimated_duration_days = (
    SELECT COALESCE(SUM(estimated_duration_days), 0)
    FROM template_packages p
    WHERE p.phase_id = ph.id
  )
  WHERE ph.id IN (
    SELECT phase_id FROM template_packages
    WHERE id = COALESCE(NEW.package_id, OLD.package_id)
  );

  -- Update template duration
  UPDATE templates t
  SET total_duration_days = (
    SELECT COALESCE(SUM(estimated_duration_days), 0)
    FROM template_phases p
    WHERE p.template_id = t.id
  )
  WHERE t.id IN (
    SELECT template_id FROM template_phases
    WHERE id IN (
      SELECT phase_id FROM template_packages
      WHERE id = COALESCE(NEW.package_id, OLD.package_id)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_template_duration
AFTER INSERT OR UPDATE OR DELETE ON template_tasks
FOR EACH ROW EXECUTE FUNCTION calculate_template_duration();
```

## Dependency Graph Modeling

### Four Dependency Types

| Type | Name | Meaning | Example |
|------|------|---------|---------|
| FS | Finish-to-Start | A must finish before B starts | Demolition -> Electrical |
| SS | Start-to-Start | A must start before B starts | Framing -> Insulation (can overlap) |
| FF | Finish-to-Finish | A must finish before B finishes | Painting -> Final cleanup |
| SF | Start-to-Finish | A must start before B finishes | Rare, backup systems |

### Dependency Table Design

Dependencies stored in `template_dependencies`:
- Links any task to any task (cross-package, cross-phase)
- Includes dependency type enum
- Includes lag time (days before/after)

### Circular Dependency Detection

Use topological sort (Kahn's algorithm) to detect cycles:

```typescript
import toposort from 'topsort';

interface Dependency {
  predecessor_task_id: string;
  successor_task_id: string;
}

function detectCircularDependency(dependencies: Dependency[]): {
  hasCircle: boolean;
  cycle?: string[];
} {
  const edges: [string, string][] = dependencies.map(d => [
    d.predecessor_task_id,
    d.successor_task_id
  ]);

  try {
    toposort(edges);
    return { hasCircle: false };
  } catch (error) {
    // topsort throws on circular dependency
    return {
      hasCircle: true,
      cycle: (error as Error).message.match(/Cycle: (.+)/)?.[1]?.split(' -> ')
    };
  }
}

// Use before saving dependencies
export async function addDependency(
  templateId: string,
  predecessorId: string,
  successorId: string,
  type: 'FS' | 'SS' | 'FF' | 'SF',
  lagDays: number = 0
) {
  // Fetch existing dependencies
  const { data: existing } = await supabase
    .from('template_dependencies')
    .select('predecessor_task_id, successor_task_id')
    .eq('template_id', templateId);

  // Add proposed dependency
  const proposed = [...existing, { predecessor_task_id: predecessorId, successor_task_id: successorId }];

  // Check for cycles
  const result = detectCircularDependency(proposed);
  if (result.hasCircle) {
    throw new Error(`Circular dependency detected: ${result.cycle?.join(' -> ')}`);
  }

  // Safe to insert
  return supabase.from('template_dependencies').insert({
    template_id: templateId,
    predecessor_task_id: predecessorId,
    successor_task_id: successorId,
    dependency_type: type,
    lag_days: lagDays
  });
}
```

## Quality Gate Implementation

### Gate Structure

Quality Gates define checkpoints at package or phase boundaries:

```typescript
interface QualityGate {
  id: string;
  gate_level: 'package' | 'phase';
  phase_id?: string;
  package_id?: string;
  name: string;
  description?: string;
  checklist_items: ChecklistRequirement[];
  min_photos_required: number;
  photo_types: string[];
  is_blocking: boolean;
  auto_approve_when_complete: boolean;
}

interface ChecklistRequirement {
  id: string;
  text: string;
  required: boolean;
}
```

### Gate Evaluation Logic

At runtime (after template application), gates are evaluated:

```typescript
interface GateStatus {
  gate_id: string;
  passed: boolean;
  checklist_complete: boolean;
  photos_complete: boolean;
  approved_at?: string;
  approved_by?: string;
}

async function evaluateGate(
  projectGateId: string
): Promise<GateStatus> {
  // Fetch gate with requirements
  const { data: gate } = await supabase
    .from('project_quality_gates')
    .select('*, checklist_progress, photos:media(id)')
    .eq('id', projectGateId)
    .single();

  // Check checklist completion
  const requiredItems = gate.checklist_items.filter((i: any) => i.required);
  const completedRequired = requiredItems.every((item: any) =>
    gate.checklist_progress?.find((p: any) => p.id === item.id && p.completed)
  );

  // Check photo requirements
  const photoCount = gate.photos?.length || 0;
  const photosComplete = photoCount >= gate.min_photos_required;

  const passed = completedRequired && photosComplete;

  // Auto-approve if enabled and passed
  if (gate.auto_approve_when_complete && passed && !gate.approved_at) {
    await supabase
      .from('project_quality_gates')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: null // System auto-approval
      })
      .eq('id', projectGateId);
  }

  return {
    gate_id: projectGateId,
    passed,
    checklist_complete: completedRequired,
    photos_complete: photosComplete,
    approved_at: gate.approved_at,
    approved_by: gate.approved_by
  };
}
```

## Template Application Logic

### Full Copy Strategy

When applying a template to a project, create independent copies of all entities:

```sql
-- PostgreSQL function for atomic template application
CREATE OR REPLACE FUNCTION apply_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_start_date DATE,
  p_excluded_tasks UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(
  tasks_created INTEGER,
  dependencies_created INTEGER,
  gates_created INTEGER
) AS $$
DECLARE
  v_id_mapping JSONB := '{}'::JSONB;
  v_phase RECORD;
  v_package RECORD;
  v_task RECORD;
  v_dep RECORD;
  v_gate RECORD;
  v_new_phase_id UUID;
  v_new_package_id UUID;
  v_new_task_id UUID;
  v_tasks_created INTEGER := 0;
  v_deps_created INTEGER := 0;
  v_gates_created INTEGER := 0;
BEGIN
  -- Create phases
  FOR v_phase IN
    SELECT * FROM template_phases
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    v_new_phase_id := gen_random_uuid();

    INSERT INTO project_phases (
      id, project_id, name, description, wbs_code, sort_order,
      estimated_duration_days, status
    ) VALUES (
      v_new_phase_id, p_project_id, v_phase.name, v_phase.description,
      v_phase.wbs_code, v_phase.sort_order, v_phase.estimated_duration_days,
      'pending'
    );

    -- Store mapping: template_phase_id -> project_phase_id
    v_id_mapping := v_id_mapping ||
      jsonb_build_object(v_phase.id::TEXT, v_new_phase_id::TEXT);

    -- Create packages for this phase
    FOR v_package IN
      SELECT * FROM template_packages
      WHERE phase_id = v_phase.id
      ORDER BY sort_order
    LOOP
      v_new_package_id := gen_random_uuid();

      INSERT INTO project_packages (
        id, phase_id, name, description, wbs_code, sort_order,
        trade_category, estimated_duration_days, estimated_cost, status
      ) VALUES (
        v_new_package_id, v_new_phase_id, v_package.name, v_package.description,
        v_package.wbs_code, v_package.sort_order, v_package.trade_category,
        v_package.estimated_duration_days, v_package.estimated_cost, 'pending'
      );

      -- Store mapping
      v_id_mapping := v_id_mapping ||
        jsonb_build_object(v_package.id::TEXT, v_new_package_id::TEXT);

      -- Create tasks for this package
      FOR v_task IN
        SELECT * FROM template_tasks
        WHERE package_id = v_package.id
          AND id != ALL(p_excluded_tasks)  -- Skip excluded optional tasks
        ORDER BY sort_order
      LOOP
        v_new_task_id := gen_random_uuid();

        INSERT INTO tasks (
          id, project_id, renovation_project_id, title, description,
          estimated_hours, checklist_items, status, priority
        ) VALUES (
          v_new_task_id, NULL, p_project_id, v_task.name, v_task.description,
          v_task.estimated_duration_days * 8,  -- Convert days to hours
          v_task.checklist_template,
          'open', 'normal'
        );

        -- Also insert into project_tasks junction
        INSERT INTO project_tasks (
          id, package_id, task_id, wbs_code, sort_order,
          estimated_duration_days, estimated_cost, trade_category,
          materials_list, is_from_template
        ) VALUES (
          gen_random_uuid(), v_new_package_id, v_new_task_id,
          v_task.wbs_code, v_task.sort_order,
          v_task.estimated_duration_days, v_task.estimated_cost,
          v_task.trade_category, v_task.materials_list, true
        );

        -- Store mapping
        v_id_mapping := v_id_mapping ||
          jsonb_build_object(v_task.id::TEXT, v_new_task_id::TEXT);

        v_tasks_created := v_tasks_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Create dependencies with remapped IDs
  FOR v_dep IN
    SELECT * FROM template_dependencies
    WHERE template_id = p_template_id
      AND predecessor_task_id != ALL(p_excluded_tasks)
      AND successor_task_id != ALL(p_excluded_tasks)
  LOOP
    INSERT INTO task_dependencies (
      task_id,
      depends_on_task_id,
      dependency_type,
      lag_days
    ) VALUES (
      (v_id_mapping ->> v_dep.successor_task_id::TEXT)::UUID,
      (v_id_mapping ->> v_dep.predecessor_task_id::TEXT)::UUID,
      v_dep.dependency_type,
      v_dep.lag_days
    );

    v_deps_created := v_deps_created + 1;
  END LOOP;

  -- Create quality gates with remapped IDs
  FOR v_gate IN
    SELECT * FROM template_quality_gates
    WHERE template_id = p_template_id
  LOOP
    INSERT INTO project_quality_gates (
      id, project_id, gate_level,
      phase_id, package_id,
      name, description, checklist_items,
      min_photos_required, photo_types,
      is_blocking, auto_approve_when_complete
    ) VALUES (
      gen_random_uuid(), p_project_id, v_gate.gate_level,
      CASE WHEN v_gate.phase_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.phase_id::TEXT)::UUID
           ELSE NULL END,
      CASE WHEN v_gate.package_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.package_id::TEXT)::UUID
           ELSE NULL END,
      v_gate.name, v_gate.description, v_gate.checklist_items,
      v_gate.min_photos_required, v_gate.photo_types,
      v_gate.is_blocking, v_gate.auto_approve_when_complete
    );

    v_gates_created := v_gates_created + 1;
  END LOOP;

  -- Update project metadata
  UPDATE renovation_projects
  SET template_id = p_template_id,
      planned_start_date = p_start_date
  WHERE id = p_project_id;

  RETURN QUERY SELECT v_tasks_created, v_deps_created, v_gates_created;
END;
$$ LANGUAGE plpgsql;
```

### Application Flow

```typescript
interface ApplyTemplateOptions {
  templateId: string;
  projectId: string;
  startDate: Date;
  excludedTaskIds?: string[];  // Optional tasks to skip
}

async function applyTemplate(options: ApplyTemplateOptions) {
  const { data, error } = await supabase.rpc('apply_template_to_project', {
    p_template_id: options.templateId,
    p_project_id: options.projectId,
    p_start_date: options.startDate.toISOString().split('T')[0],
    p_excluded_tasks: options.excludedTaskIds || []
  });

  if (error) throw error;

  return {
    tasksCreated: data[0].tasks_created,
    dependenciesCreated: data[0].dependencies_created,
    gatesCreated: data[0].gates_created
  };
}
```

### Stacking Templates

Multiple templates can be applied to the same project:

```typescript
async function stackTemplates(
  projectId: string,
  templates: { templateId: string; excludedTasks?: string[] }[],
  startDate: Date
) {
  let currentDate = startDate;
  const results = [];

  for (const template of templates) {
    const result = await applyTemplate({
      templateId: template.templateId,
      projectId,
      startDate: currentDate,
      excludedTaskIds: template.excludedTasks
    });

    results.push(result);

    // Get template duration and offset next template
    const { data: templateData } = await supabase
      .from('templates')
      .select('total_duration_days')
      .eq('id', template.templateId)
      .single();

    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + (templateData?.total_duration_days || 0));
  }

  return results;
}
```

## Gantt-Style Visualization

### SVAR React Gantt Integration

SVAR Gantt is the recommended library (MIT license, React 19 compatible):

```typescript
import { Gantt, type Task as GanttTask } from '@svar/react-gantt';
import '@svar/react-gantt/dist/gantt.css';

interface TemplateGanttProps {
  template: Template;
}

function TemplateGantt({ template }: TemplateGanttProps) {
  // Convert template structure to Gantt tasks
  const ganttTasks: GanttTask[] = [];
  let taskIndex = 0;

  template.phases.forEach((phase, phaseIdx) => {
    // Add phase as group
    ganttTasks.push({
      id: phase.id,
      text: phase.name,
      start: new Date(), // Calculated based on dependencies
      duration: phase.estimated_duration_days,
      progress: 0,
      type: 'summary',
      parent: 0
    });

    phase.packages.forEach((pkg) => {
      // Add package
      ganttTasks.push({
        id: pkg.id,
        text: pkg.name,
        start: new Date(),
        duration: pkg.estimated_duration_days,
        progress: 0,
        type: 'summary',
        parent: phase.id
      });

      pkg.tasks.forEach((task) => {
        ganttTasks.push({
          id: task.id,
          text: task.name,
          start: new Date(),
          duration: task.estimated_duration_days,
          progress: 0,
          type: 'task',
          parent: pkg.id
        });
      });
    });
  });

  // Convert dependencies to links
  const links = template.dependencies.map(dep => ({
    id: dep.id,
    source: dep.predecessor_task_id,
    target: dep.successor_task_id,
    type: dep.dependency_type // FS, SS, FF, SF
  }));

  return (
    <Gantt
      tasks={ganttTasks}
      links={links}
      scales={[
        { unit: 'month', step: 1, format: 'MMMM yyyy' },
        { unit: 'day', step: 1, format: 'd' }
      ]}
      readonly={true}
    />
  );
}
```

### Alternative: Simple Timeline View

For preview without full Gantt library:

```typescript
// Simple CSS-based timeline for preview
function SimpleTimeline({ template }: { template: Template }) {
  const totalDays = template.total_duration_days || 1;

  return (
    <div className="relative h-64 bg-gray-50 rounded border overflow-x-auto">
      {template.phases.map((phase, idx) => {
        const offset = calculatePhaseOffset(template.phases, idx);
        const width = (phase.estimated_duration_days / totalDays) * 100;

        return (
          <div
            key={phase.id}
            className="absolute h-8 bg-blue-500 rounded text-white text-xs flex items-center px-2"
            style={{
              left: `${(offset / totalDays) * 100}%`,
              width: `${width}%`,
              top: `${idx * 40}px`
            }}
          >
            {phase.name}
          </div>
        );
      })}
    </div>
  );
}
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gantt chart rendering | Custom SVG/Canvas timeline | SVAR React Gantt | Drag-drop, zoom, dependencies, tested |
| Circular dependency check | Manual graph traversal | topsort npm package | Edge cases, performance, tested |
| WBS code generation | String concatenation | Hierarchical trigger | Prevents gaps, handles reordering |
| Deep copy with ID remap | Application-level loops | PostgreSQL function | Atomic, faster, no race conditions |

**Key insight:** Dependency visualization and circular detection have subtle edge cases. Use established libraries.

## Common Pitfalls

### Pitfall 1: Non-Atomic Template Application
**What goes wrong:** Partial template applied if error mid-way
**Why it happens:** Multiple API calls without transaction
**How to avoid:** Use single PostgreSQL function in transaction
**Warning signs:** Orphan tasks, missing dependencies, gate references to non-existent entities

### Pitfall 2: ID Collision During Copy
**What goes wrong:** Dependencies point to template tasks instead of copied tasks
**Why it happens:** Not remapping IDs during copy
**How to avoid:** Maintain ID mapping table during copy, remap all references
**Warning signs:** Dependency loops, tasks not appearing in project

### Pitfall 3: Circular Dependency Creation
**What goes wrong:** Template becomes unusable, infinite loops in scheduling
**Why it happens:** UI allows any-to-any dependency linking
**How to avoid:** Validate with topological sort before save
**Warning signs:** Slow template load, browser hangs on Gantt render

### Pitfall 4: Optional Task Dependency Orphans
**What goes wrong:** Excluding optional task breaks dependency chain
**Why it happens:** Successor task depends on excluded predecessor
**How to avoid:** Warn user, auto-exclude dependent tasks, or skip those dependencies
**Warning signs:** Tasks with unresolvable "waiting for" status

### Pitfall 5: Duration Drift
**What goes wrong:** Template shows 30 days, project takes 60 days
**Why it happens:** Dependencies not accounted for in parallel execution
**How to avoid:** Calculate critical path, not just sum of durations
**Warning signs:** Initial timeline estimates always wrong

## Code Examples

### TypeScript Types for Templates

```typescript
// src/types/templates.ts

export type TemplateCategory = 'complete_renovation' | 'room_specific' | 'trade_specific';
export type TemplateScope = 'unit' | 'room';
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
export type GateLevel = 'package' | 'phase';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  scope: TemplateScope;
  target_room_type: RoomType | null;
  total_duration_days: number | null;
  total_estimated_cost: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplatePhase {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  wbs_code: string;
  estimated_duration_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplatePackage {
  id: string;
  phase_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  wbs_code: string;
  trade_category: TradeCategory | null;
  estimated_duration_days: number | null;
  estimated_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateTask {
  id: string;
  package_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  wbs_code: string;
  estimated_duration_days: number;
  estimated_cost: number | null;
  trade_category: TradeCategory | null;
  is_optional: boolean;
  materials_list: MaterialItem[];
  notes: string | null;
  checklist_template: ChecklistTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimated_cost?: number;
}

export interface ChecklistTemplateItem {
  id: string;
  text: string;
  required: boolean;
}

export interface TemplateDependency {
  id: string;
  template_id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
}

export interface TemplateQualityGate {
  id: string;
  template_id: string;
  gate_level: GateLevel;
  phase_id: string | null;
  package_id: string | null;
  name: string;
  description: string | null;
  checklist_items: GateChecklistItem[];
  min_photos_required: number;
  photo_types: string[];
  is_blocking: boolean;
  auto_approve_when_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface GateChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

// Full template with relations
export interface TemplateWithHierarchy extends Template {
  phases: (TemplatePhase & {
    packages: (TemplatePackage & {
      tasks: TemplateTask[];
    })[];
  })[];
  dependencies: TemplateDependency[];
  quality_gates: TemplateQualityGate[];
}
```

## Seed Data: Starter Templates

Three starter templates as specified:

```sql
-- Seed: Komplett-Renovation template
INSERT INTO templates (id, name, description, category, scope, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000001',
  'Komplett-Renovation (Standard)',
  'Vollstaendige Wohnungsrenovation mit allen Gewerken',
  'complete_renovation',
  'unit',
  true
);

-- Phase 1: Vorbereitung
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000001',
  '00000000-0000-0000-0008-000000000001',
  'Vorbereitung & Demontage',
  '1',
  1
);

-- Phase 2: Rohbau
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000002',
  '00000000-0000-0000-0008-000000000001',
  'Rohbauarbeiten',
  '2',
  2
);

-- Phase 3: Installation
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000003',
  '00000000-0000-0000-0008-000000000001',
  'Installationen',
  '3',
  3
);

-- Phase 4: Ausbau
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000004',
  '00000000-0000-0000-0008-000000000001',
  'Ausbau & Finish',
  '4',
  4
);

-- (Additional packages and tasks would follow similar pattern)

-- Seed: Bad-Renovation template
INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000002',
  'Badezimmer-Renovation',
  'Komplette Badezimmer-Erneuerung',
  'room_specific',
  'room',
  'bathroom',
  true
);

-- Seed: Kuechen-Renovation template
INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000003',
  'Kuechen-Renovation',
  'Komplette Kuechen-Erneuerung',
  'room_specific',
  'room',
  'kitchen',
  true
);
```

## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Microsoft Project | Web-based Gantt (SVAR, etc.) | 2023+ | No desktop software needed |
| Manual duration calc | AI-assisted estimation | 2024+ | Better initial estimates |
| gantt-task-react | SVAR React Gantt | 2024 | Active maintenance, MIT license |
| Application-level copy | Database function copy | Always best | Atomicity, performance |

**New tools/patterns to consider:**
- SVAR Gantt PRO has auto-scheduling, critical path (paid)
- MCP servers for AI-assisted template creation

**Deprecated/outdated:**
- gantt-task-react: Last published 3 years ago
- jQuery-based Gantt libraries

## Open Questions

Things that couldn't be fully resolved:

1. **Critical Path Calculation**
   - What we know: Simple sum of durations ignores parallel execution
   - What's unclear: Whether to implement CPM algorithm or use Gantt library
   - Recommendation: Use SVAR PRO for critical path if budget allows, otherwise accept simplified duration estimates

2. **Gate Blocking Behavior**
   - What we know: Context says both "hard vs soft blocking" is Claude's discretion
   - What's unclear: Whether blocking should prevent task creation or just warn
   - Recommendation: Default to soft blocking (warning) with option to enable hard blocking per gate

3. **Template Versioning**
   - What we know: Context explicitly says "No versioning - projects keep applied copy"
   - What's unclear: How to handle template improvements (existing projects unaffected, but users might want to update)
   - Recommendation: Stay with "no versioning" but add template "archived" flag for deprecated templates

## Sources

### Primary (HIGH confidence)
- PostgreSQL 18 Documentation - Recursive CTEs: https://www.postgresql.org/docs/current/queries-with.html
- SVAR React Gantt Documentation: https://docs.svar.dev/react/gantt/overview/
- Existing codebase: `supabase/migrations/011_renovation_project.sql`, `supabase/migrations/012_task_enhancements.sql`
- 08-CONTEXT.md: Prior decisions on template structure

### Secondary (MEDIUM confidence)
- [SVAR React Gantt GitHub](https://github.com/svar-widgets/react-gantt) - MIT license, active maintenance
- [topsort npm](https://www.npmjs.com/package/topsort) - Circular dependency detection
- [Dependency Types (Wikipedia)](https://en.wikipedia.org/wiki/Dependency_(project_management)) - FS/SS/FF/SF definitions

### Tertiary (LOW confidence)
- [WebSearch results on Quality Gates](https://wiki.doing-projects.org/index.php/Quality_Gates_in_Project_Management) - General patterns, needs validation

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Database schema | HIGH | Based on existing v1/v2 patterns in codebase, PostgreSQL docs |
| WBS hierarchy | HIGH | Standard relational design, verified with existing migrations |
| Dependency model | HIGH | Well-documented project management standards |
| Quality Gates | MEDIUM | Based on general patterns, specific UI/UX needs validation |
| Gantt library | MEDIUM | SVAR is MIT and active, but integration not tested |
| Template application | HIGH | PostgreSQL function pattern, atomic transactions |
| Seed templates | MEDIUM | Structure clear, specific task content needs domain expertise |

---

**Research Date:** 2026-01-18
**Valid Until:** 2026-02-17 (30 days - stable technologies)
