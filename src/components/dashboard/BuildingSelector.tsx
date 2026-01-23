'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Building2 } from 'lucide-react'

interface Building {
  id: string
  name: string
  property_name: string
}

interface BuildingSelectorProps {
  currentBuildingId: string
}

/**
 * Building selector dropdown for Liegenschaft page
 * Uses URL-based routing for building selection
 */
export function BuildingSelector({ currentBuildingId }: BuildingSelectorProps) {
  const router = useRouter()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function fetchBuildings() {
      try {
        const response = await fetch('/api/properties')
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        const allBuildings: Building[] = []

        for (const property of data.properties || []) {
          for (const building of property.buildings || []) {
            allBuildings.push({
              id: building.id,
              name: building.name,
              property_name: property.name
            })
          }
        }

        setBuildings(allBuildings)
      } catch (error) {
        console.error('Error fetching buildings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBuildings()
  }, [])

  const currentBuilding = buildings.find(b => b.id === currentBuildingId)

  function handleSelect(buildingId: string) {
    setIsOpen(false)
    if (buildingId !== currentBuildingId) {
      router.push(`/dashboard/liegenschaft?building=${buildingId}`)
    }
  }

  if (loading || buildings.length <= 1) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {currentBuilding?.name || 'Gebaeude waehlen'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto">
            {buildings.map(building => (
              <button
                key={building.id}
                onClick={() => handleSelect(building.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  building.id === currentBuildingId
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {building.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {building.property_name}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
