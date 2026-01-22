'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Partner } from '@/types/database'
import type { TradeCategory } from '@/types'
import { cn } from '@/lib/utils'

interface PartnerCardProps {
  partner: Partner
  onEdit: (partner: Partner) => void
  onToggleActive: (partnerId: string, isActive: boolean) => Promise<void>
}

// German labels for trade categories
const TRADE_LABELS: Record<TradeCategory, string> = {
  general: 'Allgemein',
  plumbing: 'Sanitaer',
  electrical: 'Elektro',
  hvac: 'Heizung/Lueftung',
  painting: 'Malerarbeiten',
  flooring: 'Bodenbelaege',
  carpentry: 'Schreinerei',
  roofing: 'Dacharbeiten',
  masonry: 'Maurerarbeiten',
  glazing: 'Glaserarbeiten',
  landscaping: 'Gartenarbeit',
  cleaning: 'Reinigung',
  demolition: 'Abbruch',
  other: 'Sonstiges',
}

/**
 * Partner card component displaying contractor/supplier information
 * Shows contact details, trade categories, and active status
 */
export function PartnerCard({ partner, onEdit, onToggleActive }: PartnerCardProps) {
  const handleToggleActive = async () => {
    await onToggleActive(partner.id, !partner.is_active)
  }

  const handleEdit = () => {
    onEdit(partner)
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        !partner.is_active && 'opacity-60 bg-gray-50 dark:bg-gray-900/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Partner info */}
          <div className="flex-1 min-w-0">
            {/* Company name and status */}
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={cn(
                  'font-semibold text-lg',
                  partner.is_active
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {partner.company_name}
              </h3>
              {/* Active/Inactive status indicator */}
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  partner.is_active ? 'bg-green-500' : 'bg-gray-400'
                )}
                title={partner.is_active ? 'Aktiv' : 'Inaktiv'}
              />
            </div>

            {/* Partner type badge */}
            <div className="mb-2">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  partner.partner_type === 'contractor'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                )}
              >
                {partner.partner_type === 'contractor' ? 'Handwerker' : 'Lieferant'}
              </span>
            </div>

            {/* Contact information */}
            <div className="space-y-1 text-sm">
              {partner.contact_name && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Kontakt:</span> {partner.contact_name}
                </p>
              )}
              {partner.email && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Email:</span>{' '}
                  <a
                    href={`mailto:${partner.email}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {partner.email}
                  </a>
                </p>
              )}
              {partner.phone && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Telefon:</span>{' '}
                  <a
                    href={`tel:${partner.phone}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {partner.phone}
                  </a>
                </p>
              )}
            </div>

            {/* Trade categories */}
            {partner.trade_categories.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {partner.trade_categories.map((category: TradeCategory) => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {TRADE_LABELS[category]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Edit button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              title="Bearbeiten"
              className="min-h-[40px] min-w-[40px] px-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </Button>

            {/* Toggle active/inactive button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleActive}
              title={partner.is_active ? 'Deaktivieren' : 'Aktivieren'}
              className="min-h-[40px] min-w-[40px] px-3"
            >
              {partner.is_active ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
