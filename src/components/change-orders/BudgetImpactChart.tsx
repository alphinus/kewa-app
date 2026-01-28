/**
 * Budget Impact Waterfall Chart
 *
 * Recharts waterfall chart showing budget flow:
 * Original Budget -> +CO1 -> +CO2 -> -CO3 -> Current Budget
 *
 * Phase 21-03: Budget Impact Analytics
 */

'use client'

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ChangeOrderData {
  co_number: string
  description: string
  total_amount: number
  approved_at: string
}

interface BudgetImpactChartProps {
  originalBudget: number
  changeOrders: ChangeOrderData[]
}

interface WaterfallDataPoint {
  name: string
  value: number
  invisible: number
  fill: string
  label?: string
}

/**
 * Format CHF currency
 */
function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Transform data for waterfall effect using stacked bars
 *
 * Pattern: Use two stacked bars - invisible (offset) + value (visible)
 * - For additions: invisible = previous cumulative, value = amount
 * - For reductions: invisible = new cumulative, value = amount
 */
function transformToWaterfallData(
  originalBudget: number,
  changeOrders: ChangeOrderData[]
): WaterfallDataPoint[] {
  const data: WaterfallDataPoint[] = []
  let cumulative = originalBudget

  // First bar: Original Budget
  data.push({
    name: 'Urspr. Budget',
    value: originalBudget,
    invisible: 0,
    fill: '#3b82f6', // Blue
  })

  // Middle bars: Each approved change order
  changeOrders.forEach((co) => {
    const previousCumulative = cumulative
    cumulative += co.total_amount

    data.push({
      name: co.co_number,
      value: Math.abs(co.total_amount),
      invisible: co.total_amount > 0 ? previousCumulative : cumulative,
      fill: co.total_amount > 0 ? '#10b981' : '#ef4444', // Green for additions, red for credits
      label: co.description,
    })
  })

  // Last bar: Current Budget
  data.push({
    name: 'Aktuelles Budget',
    value: cumulative,
    invisible: 0,
    fill: '#6366f1', // Indigo
  })

  return data
}

/**
 * Custom tooltip showing formatted amounts and descriptions
 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as WaterfallDataPoint

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-900">{data.name}</p>
        {data.label && <p className="text-xs text-gray-600 mt-1">{data.label}</p>}
        <p className="text-sm font-medium text-blue-600 mt-2">
          {formatCHF(data.value)}
        </p>
      </div>
    )
  }
  return null
}

export function BudgetImpactChart({ originalBudget, changeOrders }: BudgetImpactChartProps) {
  // Handle edge case: no approved COs
  if (changeOrders.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Keine genehmigten Aenderungsauftraege</p>
          <p className="text-sm text-gray-400 mt-1">
            Aktuelles Budget: {formatCHF(originalBudget)}
          </p>
        </div>
      </div>
    )
  }

  const data = transformToWaterfallData(originalBudget, changeOrders)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            label={{ value: 'CHF', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatCHF(value)}
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => 'Budget Flow'}
          />
          {/* Invisible bar for stacking offset (transparent) */}
          <Bar dataKey="invisible" stackId="stack" fill="transparent" />
          {/* Visible bar showing value (colored per data point) */}
          <Bar dataKey="value" stackId="stack">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
