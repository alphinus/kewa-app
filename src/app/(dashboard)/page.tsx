'use client'

import { useSession } from '@/hooks/useSession'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Dashboard home page
 * Shows different content based on user role:
 * - KEWA AG: Overview with placeholder cards
 * - Imeri: Task list with placeholder items
 */
export default function DashboardPage() {
  const { session } = useSession()
  const role = session.user?.role

  // KEWA AG dashboard - overview
  if (role === 'kewa') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Willkommen bei KEWA
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Uebersicht aller Projekte und Aufgaben
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Offene Aufgaben
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                12
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Heute erledigt
              </p>
              <p className="text-3xl font-bold text-[var(--status-success)]">
                5
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity card */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Letzte Aktivitaeten
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      Wohnung {i}. OG Links gereinigt
                    </p>
                    <p className="text-xs text-gray-500">vor {i} Stunden</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Imeri dashboard - task list
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Meine Aufgaben
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Heute zu erledigen: 3 Aufgaben
      </p>

      {/* Task list */}
      <div className="space-y-3">
        {[
          { unit: '1. OG Links', task: 'Fenster putzen', priority: 'normal' },
          { unit: '2. OG Rechts', task: 'Bad reinigen', priority: 'high' },
          { unit: 'Treppenhaus', task: 'Boden wischen', priority: 'low' }
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {item.task}
                  </p>
                  <p className="text-sm text-gray-500">{item.unit}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.priority === 'high'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      : item.priority === 'low'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}
                >
                  {item.priority === 'high'
                    ? 'Hoch'
                    : item.priority === 'low'
                    ? 'Niedrig'
                    : 'Normal'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
