'use client'

import Link from 'next/link'
import type { Template } from '@/types/templates'

interface TemplateCardProps {
  template: Template
  onDelete?: (id: string) => void
  isAdmin?: boolean
}

const categoryLabels: Record<string, string> = {
  complete_renovation: 'Komplett-Renovation',
  room_specific: 'Raum-spezifisch',
  trade_specific: 'Gewerk-spezifisch'
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

/**
 * TemplateCard Component
 *
 * Displays a template in the library view with category badge,
 * duration/cost info, and action buttons for view/edit/delete.
 */
export function TemplateCard({ template, onDelete, isAdmin }: TemplateCardProps) {
  const handleDelete = () => {
    if (onDelete && confirm('Template wirklich loeschen?')) {
      onDelete(template.id)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header with name and status */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {template.is_active ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{template.description}</p>
      )}

      {/* Category and room type badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
          {categoryLabels[template.category] || template.category}
        </span>
        {template.target_room_type && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
            {roomTypeLabels[template.target_room_type] || template.target_room_type}
          </span>
        )}
      </div>

      {/* Duration and cost info */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        {template.total_duration_days !== null && template.total_duration_days > 0 && (
          <span>{template.total_duration_days} Tage</span>
        )}
        {template.total_estimated_cost !== null && template.total_estimated_cost > 0 && (
          <span>CHF {template.total_estimated_cost.toLocaleString('de-CH')}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          href={`/templates/${template.id}`}
          className="flex-1 text-center py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition-colors min-h-[44px] flex items-center justify-center"
        >
          Ansehen
        </Link>
        {isAdmin && (
          <>
            <Link
              href={`/templates/${template.id}/edit`}
              className="py-2 px-3 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium text-blue-700 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Bearbeiten
            </Link>
            <button
              onClick={handleDelete}
              className="py-2 px-3 bg-red-100 hover:bg-red-200 rounded text-sm font-medium text-red-700 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Loeschen
            </button>
          </>
        )}
      </div>
    </div>
  )
}
