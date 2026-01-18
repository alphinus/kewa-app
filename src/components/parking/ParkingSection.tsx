import { fetchParkingSpots } from '@/lib/parking/parking-queries'
import { ParkingSpotCard } from './ParkingSpotCard'
import { cn } from '@/lib/utils'

interface ParkingSectionProps {
  buildingId: string
  className?: string
}

export async function ParkingSection({
  buildingId,
  className
}: ParkingSectionProps) {
  const spots = await fetchParkingSpots(buildingId)

  if (spots.length === 0) {
    return (
      <div className={cn(
        'p-4 text-center text-gray-500 dark:text-gray-400',
        'bg-gray-50 dark:bg-gray-800/50 rounded-lg',
        className
      )}>
        Keine Parkplaetze konfiguriert.
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Parkplaetze
      </h3>
      <div className="flex flex-col gap-2">
        {spots.map((spot) => (
          <ParkingSpotCard
            key={spot.id}
            spot={spot}
            compact
          />
        ))}
      </div>
    </div>
  )
}
