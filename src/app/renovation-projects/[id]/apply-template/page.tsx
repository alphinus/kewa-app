'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TemplateApplyWizard } from '@/components/templates/TemplateApplyWizard'

interface RenovationProject {
  id: string
  name: string
  status: string
  template_id: string | null
}

/**
 * Apply Template Page
 *
 * Page for applying a template to a renovation project.
 * Uses the TemplateApplyWizard component for the multi-step flow.
 */
export default function ApplyTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<RenovationProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load project details
  useEffect(() => {
    async function loadProject() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/renovation-projects/${projectId}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Projekt nicht gefunden')
        }
        const data = await res.json()
        setProject(data.project)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId])

  // Handle success - navigate back to project
  const handleSuccess = () => {
    router.push(`/dashboard/projekte/${projectId}`)
  }

  // Handle cancel - navigate back to project
  const handleCancel = () => {
    router.push(`/dashboard/projekte/${projectId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Projekt nicht gefunden</div>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Check if project already has a template
  if (project.template_id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vorlage bereits angewendet</h2>
          <p className="text-gray-600 mb-6">
            Dieses Projekt hat bereits eine Vorlage. Eine zweite Vorlage kann nicht angewendet werden.
          </p>
          <Link
            href={`/dashboard/projekte/${projectId}`}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zum Projekt
          </Link>
        </div>
      </div>
    )
  }

  // Check if project is in correct status
  if (project.status !== 'planned') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Status nicht gültig</h2>
          <p className="text-gray-600 mb-6">
            Vorlagen können nur auf Projekte im Status &quot;geplant&quot; angewendet werden.
            Dieses Projekt hat den Status: <strong>{project.status}</strong>
          </p>
          <Link
            href={`/dashboard/projekte/${projectId}`}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zum Projekt
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <TemplateApplyWizard
        projectId={projectId}
        projectName={project.name}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
