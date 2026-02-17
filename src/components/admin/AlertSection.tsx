'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock, UserX } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Project {
  id: string
  name: string
}

interface Partner {
  id: string
  company_name: string
}

interface AlertSectionProps {
  overdueProjects: Project[]
  stalledProjects: Project[]
  inactivePartners: Partner[]
}

interface AlertCategoryProps {
  title: string
  icon: React.ReactNode
  items: { id: string; name: string; href: string }[]
  colorClass: string
  emptyText: string
}

function AlertCategory({ title, icon, items, colorClass, emptyText }: AlertCategoryProps) {
  const [expanded, setExpanded] = useState(items.length > 0)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <span className={colorClass}>{icon}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
          {title}
        </span>
        <span className={`text-sm px-2 py-0.5 rounded-full ${colorClass} bg-opacity-10`}>
          {items.length}
        </span>
      </button>

      {expanded && (
        <ul className="mt-2 ml-6 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`text-sm hover:underline ${colorClass}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Alert section showing overdue, stalled, and inactive items
 */
export function AlertSection({ overdueProjects, stalledProjects, inactivePartners }: AlertSectionProps) {
  const hasAlerts = overdueProjects.length > 0 || stalledProjects.length > 0 || inactivePartners.length > 0

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Warnungen
        </h2>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
            <CheckCircle2 className="h-5 w-5" />
            <span>Keine Warnungen</span>
          </div>
        ) : (
          <div>
            <AlertCategory
              title="Überfaellige Projekte"
              icon={<Clock className="h-4 w-4" />}
              items={overdueProjects.map(p => ({
                id: p.id,
                name: p.name,
                href: `/dashboard/kosten/projekte/${p.id}`
              }))}
              colorClass="text-red-600 dark:text-red-400"
              emptyText="Keine überfaelligen Projekte"
            />

            <AlertCategory
              title="Stillstehende Projekte"
              icon={<AlertTriangle className="h-4 w-4" />}
              items={stalledProjects.map(p => ({
                id: p.id,
                name: p.name,
                href: `/dashboard/kosten/projekte/${p.id}`
              }))}
              colorClass="text-yellow-600 dark:text-yellow-400"
              emptyText="Keine stillstehenden Projekte"
            />

            <AlertCategory
              title="Inaktive Partner"
              icon={<UserX className="h-4 w-4" />}
              items={inactivePartners.map(p => ({
                id: p.id,
                name: p.company_name,
                href: `/dashboard/partner?edit=${p.id}`
              }))}
              colorClass="text-gray-500 dark:text-gray-400"
              emptyText="Keine inaktiven Partner"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
