'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string; unitId: string; roomId: string }>
}

export default function RoomDetailRedirect({ params }: PageProps) {
  const router = useRouter()
  const { id: buildingId, unitId, roomId } = use(params)

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch(`/api/buildings/${buildingId}`)
        if (!res.ok) throw new Error('Building not found')
        const data = await res.json()
        const propertyId = data.building?.property_id
        if (!propertyId) throw new Error('No property_id')
        router.replace(`/dashboard/objekte/${propertyId}/${buildingId}/${unitId}/raum/${roomId}`)
      } catch {
        router.replace('/dashboard/objekte')
      }
    }
    resolve()
  }, [buildingId, unitId, roomId, router])

  return (
    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
      Weiterleitung...
    </div>
  )
}
