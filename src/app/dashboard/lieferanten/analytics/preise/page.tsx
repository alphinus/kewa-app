/**
 * Price Development Analytics Page
 *
 * Dashboard page showing price history chart with filtering.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import type { PriceHistoryPoint } from '@/types/suppliers'

const PriceHistoryChart = dynamic(
  () => import('@/components/suppliers/PriceHistoryChart').then(mod => mod.PriceHistoryChart),
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

interface Supplier {
  id: string
  company_name: string
}

export default function PriceAnalyticsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [priceData, setPriceData] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [supplierId, setSupplierId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Fetch suppliers on mount
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const response = await fetch('/api/suppliers')
        if (!response.ok) throw new Error('Failed to fetch suppliers')
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      } catch (err) {
        console.error('Error fetching suppliers:', err)
      } finally {
        setLoadingSuppliers(false)
      }
    }
    fetchSuppliers()
  }, [])

  // Fetch price data
  const fetchPriceData = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (supplierId) params.append('supplier_id', supplierId)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)

      const response = await fetch(`/api/suppliers/analytics/price-history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch price history')

      const data = await response.json()
      setPriceData(data.prices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchPriceData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Preisentwicklung</h1>
        <p className="text-gray-600 mt-1">
          Analyse der Preisentwicklung über die Zeit basierend auf Lieferungen
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Filtern Sie die Preisdaten nach Lieferant und Zeitraum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="supplier">Lieferant</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Alle Lieferanten" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Lieferanten</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Von Datum</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="date-to">Bis Datum</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={fetchPriceData} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Filter anwenden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preisentwicklung CHF/Tonne</CardTitle>
          <CardDescription>
            {priceData.length > 0
              ? `${priceData.length} Lieferungen gefunden`
              : 'Keine Daten verfügbar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !priceData.length ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <PriceHistoryChart data={priceData} title="" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
