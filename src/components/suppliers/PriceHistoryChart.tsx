/**
 * Price History Chart Component
 *
 * Recharts LineChart showing CHF/tonne price trends over time.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PriceHistoryPoint } from '@/types/suppliers'

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[]
  title?: string
}

/**
 * Format CHF currency
 */
function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Custom tooltip showing formatted date and price
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const date = new Date(data.delivery_date).toLocaleDateString('de-CH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const price = data.unit_price ? formatCHF(data.unit_price) : 'N/A'

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">{date}</p>
        <p className="text-sm text-gray-600">
          Preis: <span className="font-semibold text-blue-600">{price}</span>
        </p>
      </div>
    )
  }
  return null
}

export function PriceHistoryChart({ data, title = 'Preisentwicklung' }: PriceHistoryChartProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">Keine Preisdaten vorhanden</p>
      </div>
    )
  }

  // Prepare data for chart (filter out null prices)
  const chartData = data.filter((point) => point.unit_price !== null)

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="delivery_date"
            tickFormatter={(value) => {
              return new Date(value).toLocaleDateString('de-CH', {
                month: 'short',
                year: '2-digit',
              })
            }}
          />
          <YAxis
            label={{ value: 'CHF/Tonne', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => `CHF ${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="unit_price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Preis pro Tonne"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
