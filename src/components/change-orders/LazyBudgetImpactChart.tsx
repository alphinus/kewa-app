'use client'

import dynamic from 'next/dynamic'

interface ChangeOrderData {
  co_number: string
  description: string
  total_amount: number
  approved_at: string
}

interface LazyBudgetImpactChartProps {
  originalBudget: number
  changeOrders: ChangeOrderData[]
}

const BudgetImpactChart = dynamic(
  () => import('./BudgetImpactChart').then(mod => mod.BudgetImpactChart),
  {
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border animate-pulse">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-2 text-sm">Diagramm wird geladen...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export function LazyBudgetImpactChart({ originalBudget, changeOrders }: LazyBudgetImpactChartProps) {
  return <BudgetImpactChart originalBudget={originalBudget} changeOrders={changeOrders} />
}
