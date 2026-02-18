'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PartnerList } from '@/components/partners/PartnerList'
import { PartnerForm } from '@/components/partners/PartnerForm'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import type { Partner } from '@/types/database'
import type { PartnerType } from '@/types'

/**
 * Partner Management Page
 *
 * Allows admins to:
 * - View list of all partners (contractors and suppliers)
 * - Create new partners
 * - Edit existing partners
 * - Toggle partner active status
 * - Filter partners by status and type
 *
 * Phase 13: Partner-Modul
 */
export default function PartnerPage() {
  const searchParams = useSearchParams()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [defaultPartnerType, setDefaultPartnerType] = useState<PartnerType | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  // Check for create=supplier query param on mount
  useEffect(() => {
    const createType = searchParams.get('create')
    if (createType === 'supplier' || createType === 'contractor') {
      setDefaultPartnerType(createType as PartnerType)
      setShowForm(true)
    }
  }, [searchParams])

  /**
   * Handle create new partner
   */
  function handleCreate() {
    setEditingPartner(null)
    setDefaultPartnerType(undefined)
    setShowForm(true)
  }

  /**
   * Handle edit existing partner
   */
  function handleEdit(partner: Partner) {
    setEditingPartner(partner)
    setShowForm(true)
  }

  /**
   * Handle form save success
   */
  function handleSave() {
    setShowForm(false)
    setEditingPartner(null)
    setDefaultPartnerType(undefined)
    // Trigger list refresh by incrementing key
    setRefreshKey(prev => prev + 1)
  }

  /**
   * Handle form cancel
   */
  function handleCancel() {
    setShowForm(false)
    setEditingPartner(null)
    setDefaultPartnerType(undefined)
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      <DashboardBreadcrumbs />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Partner
          </h1>
          <Button onClick={handleCreate}>
            Neuer Partner
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Handwerker und Lieferanten verwalten
        </p>
      </div>

      {/* Partner List */}
      <PartnerList
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      {/* Partner Form Modal */}
      {showForm && (
        <PartnerForm
          mode={editingPartner ? 'edit' : 'create'}
          partner={editingPartner || undefined}
          defaultPartnerType={defaultPartnerType}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
