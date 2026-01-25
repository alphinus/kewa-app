'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PartnerCard } from './PartnerCard'
import { useDebounce } from '@/hooks/useDebounce'
import type { Partner } from '@/types/database'
import type { PartnerType } from '@/types'

interface PartnerListProps {
  onEdit: (partner: Partner) => void
  refreshKey?: number
}

/**
 * Partner list component with filtering
 * Fetches partners from API and displays as cards
 */
export function PartnerList({ onEdit, refreshKey }: PartnerListProps) {
  // State
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [filterType, setFilterType] = useState<'all' | 'contractor' | 'supplier'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search update
  const updateDebouncedQuery = useCallback((query: string) => {
    setDebouncedQuery(query)
    setIsSearching(false)
  }, [])
  const debouncedSearch = useDebounce(updateDebouncedQuery, 300)

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    debouncedSearch(value)
  }, [debouncedSearch])

  // Filter partners based on search query
  const filteredPartners = useMemo(() => {
    if (!debouncedQuery.trim()) return partners

    const query = debouncedQuery.toLowerCase()
    return partners.filter(partner => {
      const companyMatch = partner.company_name?.toLowerCase().includes(query) ?? false
      const contactMatch = partner.contact_name?.toLowerCase().includes(query) ?? false
      const emailMatch = partner.email?.toLowerCase().includes(query) ?? false
      const tradeMatch = partner.trade_categories?.some(
        trade => trade.toLowerCase().includes(query)
      ) ?? false

      return companyMatch || contactMatch || emailMatch || tradeMatch
    })
  }, [partners, debouncedQuery])

  // Fetch partners
  useEffect(() => {
    fetchPartners()
  }, [filterActive, filterType, refreshKey])

  async function fetchPartners() {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (filterActive !== 'all') {
        params.append('is_active', filterActive)
      }
      if (filterType !== 'all') {
        params.append('type', filterType)
      }

      const response = await fetch(`/api/partners?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Partner')
      }

      const data = await response.json()
      setPartners(data.partners || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Toggle partner active status
   */
  async function handleToggleActive(partnerId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Partner-Status')
      }

      // Refetch partners
      await fetchPartners()
    } catch (err) {
      console.error('Error toggling partner active status:', err)
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Laden...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Suche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Partner suchen..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dropdown filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Active status filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'true' | 'false')}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle</option>
                <option value="true">Aktiv</option>
                <option value="false">Inaktiv</option>
              </select>
            </div>

            {/* Partner type filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Typ
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'contractor' | 'supplier')}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle</option>
                <option value="contractor">Handwerker</option>
                <option value="supplier">Lieferanten</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isSearching ? (
              'Suche...'
            ) : (
              `Zeige ${filteredPartners.length} von ${partners.length} Partnern`
            )}
          </div>
        </CardContent>
      </Card>

      {/* Partner list or empty state */}
      {filteredPartners.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {partners.length === 0 ? 'Keine Partner vorhanden' : 'Keine Partner gefunden'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onEdit={onEdit}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
