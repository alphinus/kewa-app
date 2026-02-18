'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function WohnungDetailRedirect({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    async function resolve() {
      try {
        const unitRes = await fetch(`/api/units/${id}`)
        if (!unitRes.ok) throw new Error('Unit not found')
        const unitData = await unitRes.json()
        const buildingId = unitData.unit?.building_id
        if (!buildingId) throw new Error('No building_id')

        const buildingRes = await fetch(`/api/buildings/${buildingId}`)
        if (!buildingRes.ok) throw new Error('Building not found')
        const buildingData = await buildingRes.json()
        const propertyId = buildingData.building?.property_id
        if (!propertyId) throw new Error('No property_id')

        router.replace(`/dashboard/objekte/${propertyId}/${buildingId}/${id}`)
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
