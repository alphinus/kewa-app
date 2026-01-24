'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProjectCreateWithTemplate } from '@/components/projects/ProjectCreateWithTemplate'

interface UnitActionsProps {
  unitId: string
  unitName: string
}

/**
 * UnitActions - Client component for unit action buttons with project creation modal
 */
export function UnitActions({ unitId, unitName }: UnitActionsProps) {
  const router = useRouter()
  const [showCreateProject, setShowCreateProject] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Link
          href={`/dashboard/kosten/wohnungen/${unitId}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Kosten
        </Link>
        <Link
          href={`/dashboard/aufgaben?unit_id=${unitId}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Aufgaben
        </Link>
        <button
          onClick={() => setShowCreateProject(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + Neues Projekt
        </button>
      </div>

      {/* Project Creation Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Neues Projekt erstellen
              </h2>
              <button
                onClick={() => setShowCreateProject(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                aria-label="Schliessen"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ProjectCreateWithTemplate
                unitId={unitId}
                unitName={unitName}
                onSuccess={(projectId) => {
                  setShowCreateProject(false)
                  router.push(`/dashboard/projekte/${projectId}`)
                }}
                onCancel={() => setShowCreateProject(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
