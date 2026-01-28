/**
 * Re-inspection Scheduling
 *
 * Functions for scheduling follow-up inspections and retrieving inspection history chains.
 * Phase: 23-inspection-advanced
 */

import { createClient } from '@/lib/supabase/server'
import type { Inspection, InspectionDefect, ChecklistSectionResult } from '@/types/inspections'

/**
 * Schedule a re-inspection from a completed/signed parent inspection.
 *
 * - Copies checklist structure from parent
 * - Copies deferred defects to new inspection as open defects
 * - Links new inspection to parent via parent_inspection_id
 */
export async function scheduleReInspection(
  parentInspectionId: string,
  scheduledDate: string,
  inspectorId?: string
): Promise<Inspection> {
  const supabase = await createClient()

  // Fetch parent inspection with defects
  const { data: parent, error: parentError } = await supabase
    .from('inspections')
    .select(`
      *,
      work_order:work_orders(id, title, wo_number),
      project:renovation_projects(id, name),
      template:inspection_templates(id, name)
    `)
    .eq('id', parentInspectionId)
    .single()

  if (parentError || !parent) {
    throw new Error('Parent inspection not found')
  }

  // Parent must be completed or signed
  if (!['completed', 'signed'].includes(parent.status)) {
    throw new Error('Cannot create re-inspection from incomplete inspection')
  }

  // Fetch deferred defects from parent
  const { data: defects } = await supabase
    .from('inspection_defects')
    .select('*')
    .eq('inspection_id', parentInspectionId)
    .eq('action', 'deferred')

  // Reset checklist items to unchecked state for re-inspection
  const resetChecklistItems: ChecklistSectionResult[] = ((parent.checklist_items as ChecklistSectionResult[]) || []).map(section => ({
    section_id: section.section_id,
    name: section.name,
    items: section.items.map(item => ({
      item_id: item.item_id,
      status: 'na' as const,
      notes: null,
      checked_at: new Date().toISOString(),
      photo_storage_paths: [],
    })),
  }))

  // Create re-inspection with parent link
  const { data: reInspection, error: createError } = await supabase
    .from('inspections')
    .insert({
      parent_inspection_id: parent.id,
      work_order_id: parent.work_order_id,
      project_id: parent.project_id,
      template_id: parent.template_id,
      title: `Nachkontrolle: ${parent.title}`,
      description: `Re-Inspektion von ${new Date(parent.inspection_date).toLocaleDateString('de-CH')}`,
      inspector_id: inspectorId || parent.inspector_id,
      inspection_date: scheduledDate,
      status: 'in_progress',
      checklist_items: resetChecklistItems,
    })
    .select(`
      *,
      work_order:work_orders(id, title, wo_number),
      project:renovation_projects(id, name),
      template:inspection_templates(id, name)
    `)
    .single()

  if (createError) {
    throw new Error(`Failed to create re-inspection: ${createError.message}`)
  }

  // Copy deferred defects from parent to new inspection
  const deferredDefects = defects || []

  if (deferredDefects.length > 0) {
    const newDefects = deferredDefects.map((d: InspectionDefect) => ({
      inspection_id: reInspection.id,
      title: d.title,
      description: `(Aus vorheriger Abnahme) ${d.description || ''}`.trim(),
      severity: d.severity,
      status: 'open',
      notes: `Original defect ID: ${d.id}`,
      created_by: d.created_by,
    }))

    const { error: defectError } = await supabase
      .from('inspection_defects')
      .insert(newDefects)

    if (defectError) {
      console.error('Failed to copy defects:', defectError)
      // Continue anyway - inspection was created successfully
    }
  }

  return reInspection as Inspection
}

/**
 * Get the complete inspection history chain for an inspection.
 *
 * Returns inspections from root (original) to all children, including the current inspection.
 * Ordered by inspection_date ascending.
 */
export async function getInspectionHistory(inspectionId: string): Promise<Inspection[]> {
  const supabase = await createClient()

  // Find root inspection by traversing up the parent chain
  let currentId: string | null = inspectionId
  let rootId = inspectionId

  while (currentId) {
    const result = await supabase
      .from('inspections')
      .select('id, parent_inspection_id')
      .eq('id', currentId)
      .single()

    const inspectionData = result.data as { id: string; parent_inspection_id: string | null } | null
    if (!inspectionData) break

    if (inspectionData.parent_inspection_id) {
      rootId = inspectionData.parent_inspection_id
      currentId = inspectionData.parent_inspection_id
    } else {
      rootId = inspectionData.id
      break
    }
  }

  // Now fetch the entire chain starting from root
  const chain: Inspection[] = []
  const visited = new Set<string>()

  async function fetchChain(id: string) {
    if (visited.has(id)) return
    visited.add(id)

    const { data: inspection } = await supabase
      .from('inspections')
      .select(`
        *,
        work_order:work_orders(id, title, wo_number),
        project:renovation_projects(id, name),
        template:inspection_templates(id, name)
      `)
      .eq('id', id)
      .single()

    if (!inspection) return

    chain.push(inspection as Inspection)

    // Find all children of this inspection
    const { data: children } = await supabase
      .from('inspections')
      .select('id')
      .eq('parent_inspection_id', id)
      .order('inspection_date', { ascending: true })

    if (children) {
      for (const child of children) {
        await fetchChain(child.id)
      }
    }
  }

  await fetchChain(rootId)

  // Sort by inspection_date
  chain.sort((a, b) =>
    new Date(a.inspection_date).getTime() - new Date(b.inspection_date).getTime()
  )

  return chain
}

/**
 * Check if an inspection has children (re-inspections)
 */
export async function hasReInspections(inspectionId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('parent_inspection_id', inspectionId)

  if (error) return false

  return (count ?? 0) > 0
}
