'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function LiegenschaftDetailRedirect({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch(`/api/buildings/${id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        const propertyId = data.building?.property_id
        if (!propertyId) throw new Error('No property_id')
        router.replace(`/dashboard/objekte/${propertyId}/${id}`)
      } catch {
        router.replace('/dashboard/objekte')
      }
    }
    resolve()
  }, [id, router])

  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      Weiterleitung...
    </div>
  )
}
