'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WBSTree } from '@/components/templates/WBSTree'
import { fetchTemplate, deleteTemplate } from '@/lib/api/templates'
import type { TemplateWithHierarchy, TemplateTask } from '@/types/templates'

const categoryLabels: Record<string, string> = {
  complete_renovation: 'Komplett-Renovation',
  room_specific: 'Raum-spezifisch',
  trade_specific: 'Gewerk-spezifisch'
}

const scopeLabels: Record<string, string> = {
  unit: 'Wohnung',
  room: 'Raum'
}

const roomTypeLabels: Record<string, string> = {
  bathroom: 'Bad',
  kitchen: 'Kueche',
  bedroom: 'Schlafzimmer',
  living_room: 'Wohnzimmer',
  hallway: 'Flur',
  balcony: 'Balkon',
  storage: 'Abstellraum',
  laundry: 'Waschkueche',
  garage: 'Garage',
  office: 'Buero',
  other: 'Andere'
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Template Detail Page
 *
 * Shows full template information with WBS hierarchy,
 * quality gates, dependencies, and action buttons.
 */
export default function TemplateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateWithHierarchy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TemplateTask | null>(null)

  useEffect(() => {
    loadTemplate()
    checkAdminStatus()
  }, [id])

  async function loadTemplate() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTemplate(id)
      setTemplate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  async function checkAdminStatus() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      setIsAdmin(data.role === 'kewa')
    } catch {
      setIsAdmin(false)
    }
  }

  async function handleDelete() {
    if (!template) return
    if (!confirm('Template wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.')) return

    try {
      await deleteTemplate(template.id)
      router.push('/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    }
  }

  // Calculate statistics
  const stats = template ? {
    phaseCount: template.phases.length,
    packageCount: template.phases.reduce((sum, p) => sum + (p.packages?.length || 0), 0),
    taskCount: template.phases.reduce((sum, p) =>
      sum + (p.packages?.reduce((psum, pkg) => psum + (pkg.tasks?.length || 0), 0) || 0), 0
    ),
    optionalTaskCount: template.phases.reduce((sum, p) =>
      sum + (p.packages?.reduce((psum, pkg) =>
        psum + (pkg.tasks?.filter(t => t.is_optional).length || 0), 0) || 0), 0
    ),
    qualityGateCount: template.quality_gates?.length || 0,
    dependencyCount: template.dependencies?.length || 0
  } : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Lade Template...</p>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error || 'Template nicht gefunden'}
          </div>
          <Link href="/templates" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Zurueck zur Bibliothek
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <Link href="/templates" className="text-blue-600 hover:text-blue-700">
            Template-Bibliothek
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">{template.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h1>
              {template.description && (
                <p className="text-gray-600 mb-4">{template.description}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {categoryLabels[template.category] || template.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {scopeLabels[template.scope] || template.scope}
                </span>
                {template.target_room_type && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {roomTypeLabels[template.target_room_type] || template.target_room_type}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <Link
                    href={`/templates/${template.id}/edit`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] flex items-center"
                  >
                    Bearbeiten
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 min-h-[44px]"
                  >
                    Loeschen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Phasen" value={stats.phaseCount} />
            <StatCard label="Pakete" value={stats.packageCount} />
            <StatCard label="Aufgaben" value={stats.taskCount} />
            <StatCard label="Optional" value={stats.optionalTaskCount} />
            {template.total_duration_days !== null && template.total_duration_days > 0 && (
              <StatCard label="Dauer" value={`${template.total_duration_days} Tage`} />
            )}
            {template.total_estimated_cost !== null && template.total_estimated_cost > 0 && (
              <StatCard label="Kosten" value={`CHF ${template.total_estimated_cost.toLocaleString('de-CH')}`} />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* WBS Tree */}
          <div className="lg:col-span-2 bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">WBS-Struktur</h2>
            <WBSTree
              phases={template.phases}
              expandAll
              onTaskClick={setSelectedTask}
            />
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Task details */}
            {selectedTask && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Aufgaben-Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">WBS:</span>
                    <span className="ml-2 font-mono">{selectedTask.wbs_code}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2">{selectedTask.name}</span>
                  </div>
                  {selectedTask.description && (
                    <div>
                      <span className="text-gray-500">Beschreibung:</span>
                      <p className="mt-1 text-gray-700">{selectedTask.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Dauer:</span>
                    <span className="ml-2">{selectedTask.estimated_duration_days} Tage</span>
                  </div>
                  {selectedTask.estimated_cost !== null && selectedTask.estimated_cost > 0 && (
                    <div>
                      <span className="text-gray-500">Kosten:</span>
                      <span className="ml-2">CHF {selectedTask.estimated_cost.toLocaleString('de-CH')}</span>
                    </div>
                  )}
                  {selectedTask.trade_category && (
                    <div>
                      <span className="text-gray-500">Gewerk:</span>
                      <span className="ml-2">{selectedTask.trade_category}</span>
                    </div>
                  )}
                  {selectedTask.is_optional && (
                    <div className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                      Optional
                    </div>
                  )}
                  {selectedTask.notes && (
                    <div>
                      <span className="text-gray-500">Notizen:</span>
                      <p className="mt-1 text-gray-700">{selectedTask.notes}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Schliessen
                </button>
              </div>
            )}

            {/* Quality gates */}
            {template.quality_gates && template.quality_gates.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Quality Gates</h3>
                <div className="space-y-2">
                  {template.quality_gates.map(gate => (
                    <div key={gate.id} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                      <div className="font-medium">{gate.name}</div>
                      <div className="text-gray-500 text-xs">
                        {gate.gate_level === 'phase' ? 'Phase' : 'Paket'}
                        {gate.min_photos_required > 0 && ` - ${gate.min_photos_required} Fotos`}
                        {gate.is_blocking && ' - Blockierend'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies summary */}
            {template.dependencies && template.dependencies.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Abhaengigkeiten</h3>
                <p className="text-sm text-gray-600">
                  {template.dependencies.length} Abhaengigkeit(en) definiert
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Detaillierte Ansicht im Gantt-Diagramm verfuegbar
                </p>
              </div>
            )}

            {/* Apply to project button */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Auf Projekt anwenden</h3>
              <p className="text-sm text-blue-700 mb-3">
                Erstellt ein neues Renovationsprojekt basierend auf diesem Template.
              </p>
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
                onClick={() => alert('Template-Anwendung wird in Plan 08-03 implementiert')}
              >
                Template anwenden
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Statistics card component
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}
