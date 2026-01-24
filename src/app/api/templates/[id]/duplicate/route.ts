import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type {
  TemplatePhase,
  TemplatePackage,
  TemplateTask,
  TemplateDependency,
  TemplateQualityGate
} from '@/types/templates'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface DuplicateRequestBody {
  name?: string
}

/**
 * POST /api/templates/[id]/duplicate - Create a deep copy of a template
 *
 * Admin only (kewa role)
 * Creates new template with all phases, packages, tasks, dependencies, and quality gates.
 * Dependencies and quality gates are remapped to new IDs.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: sourceId } = await params
    const supabase = await createClient()

    // Parse request body for optional new name
    let body: DuplicateRequestBody = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Empty body is fine, we'll use default name
    }

    // Validate name if provided
    if (body.name !== undefined && body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    // Fetch source template with full hierarchy
    const { data: sourceTemplate, error: fetchError } = await supabase
      .from('templates')
      .select(`
        *,
        phases:template_phases (
          *,
          packages:template_packages (
            *,
            tasks:template_tasks (*)
          )
        ),
        dependencies:template_dependencies (*),
        quality_gates:template_quality_gates (*)
      `)
      .eq('id', sourceId)
      .order('sort_order', { referencedTable: 'template_phases' })
      .order('sort_order', { referencedTable: 'template_phases.template_packages' })
      .order('sort_order', { referencedTable: 'template_phases.template_packages.template_tasks' })
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching source template:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Build new template name
    const newName = body.name?.trim() || `${sourceTemplate.name} (Kopie)`

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: newName,
        description: sourceTemplate.description,
        category: sourceTemplate.category,
        scope: sourceTemplate.scope,
        target_room_type: sourceTemplate.target_room_type,
        total_duration_days: sourceTemplate.total_duration_days,
        total_estimated_cost: sourceTemplate.total_estimated_cost,
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (templateError) {
      console.error('Error creating template:', templateError)
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    // ID mappings for remapping dependencies and quality gates
    const phaseIdMap = new Map<string, string>()
    const packageIdMap = new Map<string, string>()
    const taskIdMap = new Map<string, string>()

    // Copy phases
    const phases = (sourceTemplate.phases as TemplatePhase[]) || []
    for (const phase of phases) {
      const { data: newPhase, error: phaseError } = await supabase
        .from('template_phases')
        .insert({
          template_id: newTemplate.id,
          name: phase.name,
          description: phase.description,
          sort_order: phase.sort_order,
          wbs_code: phase.wbs_code,
          estimated_duration_days: phase.estimated_duration_days
        })
        .select()
        .single()

      if (phaseError) {
        console.error('Error creating phase:', phaseError)
        // Rollback: delete the new template (cascade will clean up phases)
        await supabase.from('templates').delete().eq('id', newTemplate.id)
        return NextResponse.json({ error: 'Failed to copy phases' }, { status: 500 })
      }

      phaseIdMap.set(phase.id, newPhase.id)

      // Copy packages for this phase
      const packages = ((phase as TemplatePhase & { packages?: TemplatePackage[] }).packages) || []
      for (const pkg of packages) {
        const { data: newPackage, error: packageError } = await supabase
          .from('template_packages')
          .insert({
            phase_id: newPhase.id,
            name: pkg.name,
            description: pkg.description,
            sort_order: pkg.sort_order,
            wbs_code: pkg.wbs_code,
            trade_category: pkg.trade_category,
            estimated_duration_days: pkg.estimated_duration_days,
            estimated_cost: pkg.estimated_cost
          })
          .select()
          .single()

        if (packageError) {
          console.error('Error creating package:', packageError)
          await supabase.from('templates').delete().eq('id', newTemplate.id)
          return NextResponse.json({ error: 'Failed to copy packages' }, { status: 500 })
        }

        packageIdMap.set(pkg.id, newPackage.id)

        // Copy tasks for this package
        const tasks = ((pkg as TemplatePackage & { tasks?: TemplateTask[] }).tasks) || []
        for (const task of tasks) {
          const { data: newTask, error: taskError } = await supabase
            .from('template_tasks')
            .insert({
              package_id: newPackage.id,
              name: task.name,
              description: task.description,
              sort_order: task.sort_order,
              wbs_code: task.wbs_code,
              estimated_duration_days: task.estimated_duration_days,
              estimated_cost: task.estimated_cost,
              trade_category: task.trade_category,
              is_optional: task.is_optional,
              materials_list: task.materials_list,
              notes: task.notes,
              checklist_template: task.checklist_template
            })
            .select()
            .single()

          if (taskError) {
            console.error('Error creating task:', taskError)
            await supabase.from('templates').delete().eq('id', newTemplate.id)
            return NextResponse.json({ error: 'Failed to copy tasks' }, { status: 500 })
          }

          taskIdMap.set(task.id, newTask.id)
        }
      }
    }

    // Copy dependencies with remapped task IDs
    const dependencies = (sourceTemplate.dependencies as TemplateDependency[]) || []
    for (const dep of dependencies) {
      const newPredecessorId = taskIdMap.get(dep.predecessor_task_id)
      const newSuccessorId = taskIdMap.get(dep.successor_task_id)

      // Skip if either task wasn't copied (shouldn't happen, but safety check)
      if (!newPredecessorId || !newSuccessorId) {
        console.warn('Skipping dependency - task not found in map:', dep)
        continue
      }

      const { error: depError } = await supabase
        .from('template_dependencies')
        .insert({
          template_id: newTemplate.id,
          predecessor_task_id: newPredecessorId,
          successor_task_id: newSuccessorId,
          dependency_type: dep.dependency_type,
          lag_days: dep.lag_days
        })

      if (depError) {
        console.error('Error creating dependency:', depError)
        await supabase.from('templates').delete().eq('id', newTemplate.id)
        return NextResponse.json({ error: 'Failed to copy dependencies' }, { status: 500 })
      }
    }

    // Copy quality gates with remapped phase/package IDs
    const qualityGates = (sourceTemplate.quality_gates as TemplateQualityGate[]) || []
    for (const gate of qualityGates) {
      const newPhaseId = gate.phase_id ? phaseIdMap.get(gate.phase_id) : null
      const newPackageId = gate.package_id ? packageIdMap.get(gate.package_id) : null

      // Skip if referenced phase/package wasn't copied
      if (gate.phase_id && !newPhaseId) {
        console.warn('Skipping quality gate - phase not found in map:', gate)
        continue
      }
      if (gate.package_id && !newPackageId) {
        console.warn('Skipping quality gate - package not found in map:', gate)
        continue
      }

      const { error: gateError } = await supabase
        .from('template_quality_gates')
        .insert({
          template_id: newTemplate.id,
          gate_level: gate.gate_level,
          phase_id: newPhaseId,
          package_id: newPackageId,
          name: gate.name,
          description: gate.description,
          checklist_items: gate.checklist_items,
          min_photos_required: gate.min_photos_required,
          photo_types: gate.photo_types,
          is_blocking: gate.is_blocking,
          auto_approve_when_complete: gate.auto_approve_when_complete
        })

      if (gateError) {
        console.error('Error creating quality gate:', gateError)
        await supabase.from('templates').delete().eq('id', newTemplate.id)
        return NextResponse.json({ error: 'Failed to copy quality gates' }, { status: 500 })
      }
    }

    // Return the new template (without hierarchy for response size)
    return NextResponse.json({ template: newTemplate })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/duplicate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
