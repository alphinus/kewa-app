/**
 * Seasonal Consumption Analytics Page
 *
 * Dashboard page showing seasonal consumption patterns with filtering.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import type { SeasonalConsumption } from '@/types/suppliers'

const ConsumptionPatternChart = dynamic(
  () => import('@/components/suppliers/ConsumptionPatternChart').then(mod => mod.ConsumptionPatternChart),
  {
    loading: () => (
      <div className="w-full h-[350px] flex items-center justify-center bg-gray-50 rounded-lg border animate-pulse">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-2 text-sm">Diagramm wird geladen...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

interface Property {
  id: string
  name: string
}

interface EnrichedConsumption extends SeasonalConsumption {
  monthName: string
  property_name?: string | null
}

export default function ConsumptionAnalyticsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [consumptionData, setConsumptionData] = useState<EnrichedConsumption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter
  const [propertyId, setPropertyId] = useState<string>('')

  // Fetch properties on mount
  useEffect(() => {
    async function fetchProperties() {
      try {
        const response = await fetch('/api/properties')
        if (!response.ok) throw new Error('Failed to fetch properties')
        const data = await response.json()
        setProperties(data.properties || [])
      } catch (err) {
        console.error('Error fetching properties:', err)
      } finally {
        setLoadingProperties(false)
      }
    }
    fetchProperties()
  }, [])

  // Fetch consumption data
  const fetchConsumptionData = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (propertyId) params.append('property_id', propertyId)

      const response = await fetch(`/api/suppliers/analytics/consumption?${params}`)
      if (!response.ok) throw new Error('Failed to fetch consumption data')

      const data = await response.json()
      setConsumptionData(data.consumption || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on mount and when filter changes
  useEffect(() => {
    fetchConsumptionData()
  }, [])

  // Calculate summary statistics
  const totalDeliveries = consumptionData.reduce((sum, item) => sum + item.delivery_count, 0)
  const totalQuantity = consumptionData.reduce((sum, item) => sum + item.total_quantity, 0)
  const avgMonthlyQuantity = consumptionData.length > 0 ? totalQuantity / consumptionData.length : 0

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs />
      <div>
        <h1 className="text-3xl font-bold">Saisonaler Verbrauch</h1>
        <p className="text-gray-600 mt-1">
          Analyse der monatlichen Verbrauchsmuster basierend auf historischen Lieferungen
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Filtern Sie die Verbrauchsdaten nach Liegenschaft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property">Liegenschaft</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Alle Liegenschaften" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Liegenschaften</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchConsumptionData} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Filter anwenden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      {consumptionData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamtlieferungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeliveries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamtmenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuantity.toFixed(2)} t</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Durchschnitt pro Monat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMonthlyQuantity.toFixed(2)} t</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle>Monatlicher Verbrauch</CardTitle>
          <CardDescription>
            {consumptionData.length > 0
              ? `${consumptionData.length} Monate mit Daten`
              : 'Keine Daten verfügbar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !consumptionData.length ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <ConsumptionPatternChart data={consumptionData} title="" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
