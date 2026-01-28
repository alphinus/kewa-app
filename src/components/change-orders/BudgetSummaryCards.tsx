/**
 * Budget Summary Cards
 *
 * Four-card grid showing key budget metrics:
 * - Original Budget
 * - Approved COs
 * - Current Budget
 * - Pending COs
 *
 * Phase 21-03: Budget Impact Analytics
 */

'use client'

import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'

interface BudgetSummaryCardsProps {
  originalBudget: number
  approvedTotal: number
  netBudget: number
  pendingTotal: number
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

export function BudgetSummaryCards({
  originalBudget,
  approvedTotal,
  netBudget,
  pendingTotal,
}: BudgetSummaryCardsProps) {
  const cards = [
    {
      label: 'Urspruengliches Budget',
      amount: originalBudget,
      icon: DollarSign,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
    {
      label: 'Genehmigte AAs',
      amount: approvedTotal,
      icon: approvedTotal >= 0 ? TrendingUp : TrendingDown,
      bgColor: approvedTotal >= 0 ? 'bg-green-50' : 'bg-red-50',
      iconColor: approvedTotal >= 0 ? 'text-green-600' : 'text-red-600',
      textColor: approvedTotal >= 0 ? 'text-green-900' : 'text-red-900',
    },
    {
      label: 'Aktuelles Budget',
      amount: netBudget,
      icon: DollarSign,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      textColor: 'text-indigo-900',
    },
    {
      label: 'Haengige AAs',
      amount: pendingTotal,
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={index}
            className={`${card.bgColor} rounded-lg p-6 border border-gray-200`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {formatCHF(card.amount)}
                </p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-full`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
