/**
 * Inspection Templates List Page
 *
 * List all inspection templates with basic info.
 * Path: /dashboard/vorlagen/abnahmen
 * Phase: 22-inspection-core Plan 03
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { InspectionTemplate } from '@/types/inspections'

export default async function InspectionTemplatesPage() {
  const supabase = await createClient()

  // Fetch templates
  const { data: templates } = await supabase
    .from('inspection_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const typedTemplates = (templates || []) as InspectionTemplate[]

  // German labels for trade categories
  const tradeLabels: Record<string, string> = {
    general: 'Allgemein',
    plumbing: 'Sanitär',
    electrical: 'Elektro',
    hvac: 'Heizung/Klima',
    painting: 'Malerarbeiten',
    flooring: 'Bodenbeläge',
    carpentry: 'Schreinerei',
    roofing: 'Dach',
    masonry: 'Mauerwerk',
    glazing: 'Verglasung',
    landscaping: 'Gartenbau',
    cleaning: 'Reinigung',
    demolition: 'Abbruch',
    other: 'Andere',
  }

  // Calculate item counts
  const getItemCount = (template: InspectionTemplate) => {
    return template.checklist_sections.reduce(
      (total, section) => total + section.items.length,
      0
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/vorlagen" className="hover:text-gray-700 dark:hover:text-gray-300">
          Vorlagen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Abnahmen</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Abnahme-Vorlagen
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {typedTemplates.length} {typedTemplates.length === 1 ? 'Vorlage' : 'Vorlagen'}
          </p>
        </div>
        <Link href="/dashboard/vorlagen/abnahmen/neu">
          <Button className="min-h-[48px]">Neue Vorlage</Button>
        </Link>
      </div>

      {/* Template list */}
      {typedTemplates.length === 0 ? (
        <div className="p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Noch keine Vorlagen erstellt.
          </p>
          <Link href="/dashboard/vorlagen/abnahmen/neu">
            <Button>Erste Vorlage erstellen</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedTemplates.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/vorlagen/abnahmen/${template.id}`}
              className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {template.name}
              </h3>

              {template.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                  {tradeLabels[template.trade_category] || template.trade_category}
                </span>
                <span>
                  {getItemCount(template)} Punkte
                </span>
                <span className={`px-2 py-1 rounded ${
                  template.formality_level === 'formal_abnahme'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {template.formality_level === 'formal_abnahme' ? 'Formales Protokoll' : 'Informeller Check'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
