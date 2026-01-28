/**
 * Seasonal Consumption Pattern Chart Component
 *
 * Recharts AreaChart showing monthly consumption patterns.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SeasonalConsumption } from '@/types/suppliers'

interface ConsumptionPatternChartProps {
  data: Array<SeasonalConsumption & { monthName?: string }>
  title?: string
}

/**
 * Custom tooltip showing quantity with Tonnen suffix
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const quantity = data.avg_quantity_per_delivery?.toFixed(2) ?? '0.00'

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">
          {data.monthName || `Monat ${data.month}`} {data.year}
        </p>
        <p className="text-sm text-gray-600">
          Durchschnitt: <span className="font-semibold text-blue-600">{quantity} Tonnen</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.delivery_count} Lieferung{data.delivery_count !== 1 ? 'en' : ''}
        </p>
      </div>
    )
  }
  return null
}

export function ConsumptionPatternChart({
  data,
  title = 'Saisonaler Verbrauch',
}: ConsumptionPatternChartProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">Keine Verbrauchsdaten vorhanden</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="monthName"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'Durchschn. Menge (Tonnen)', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="avg_quantity_per_delivery"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorQuantity)"
            name="Durchschnittliche Menge"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 text-center mt-4">
        Durchschnittlicher Verbrauch pro Monat basierend auf historischen Lieferungen
      </p>
    </div>
  )
}
