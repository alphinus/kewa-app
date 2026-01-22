'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PartnerList } from '@/components/partners/PartnerList'
import { PartnerForm } from '@/components/partners/PartnerForm'
import type { Partner } from '@/types/database'

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
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  /**
   * Handle create new partner
   */
  function handleCreate() {
    setEditingPartner(null)
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
    // Trigger list refresh by incrementing key
    setRefreshKey(prev => prev + 1)
  }

  /**
   * Handle form cancel
   */
  function handleCancel() {
    setShowForm(false)
    setEditingPartner(null)
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
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
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
