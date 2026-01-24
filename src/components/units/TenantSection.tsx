'use client'

import { User, Phone, Mail, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatSwissDate } from '@/lib/costs/payment-helpers'

/**
 * Tenant info for display in TenantSection
 */
interface TenantSectionProps {
  tenant: {
    name: string | null
    phone: string | null
    email: string | null
    move_in_date: string | null
  } | null
  isVacant: boolean
}

/**
 * TenantSection Component
 *
 * Displays tenant information or Leerstand badge if unit is vacant.
 * Shows tenant name, phone, email, and move-in date when tenant exists.
 *
 * Phase 15-04: Unit Detail Page
 */
export function TenantSection({ tenant, isVacant }: TenantSectionProps) {
  // Show Leerstand if vacant or no tenant name
  if (isVacant || !tenant?.name) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Mieter
          </h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Leerstand
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Mieter
        </h3>
        <div className="space-y-2">
          {/* Tenant Name */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {tenant.name}
            </span>
          </div>

          {/* Phone */}
          {tenant.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <a
                href={`tel:${tenant.phone}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {tenant.phone}
              </a>
            </div>
          )}

          {/* Email */}
          {tenant.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <a
                href={`mailto:${tenant.email}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {tenant.email}
              </a>
            </div>
          )}

          {/* Move-in Date */}
          {tenant.move_in_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Einzug: {formatSwissDate(tenant.move_in_date)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
