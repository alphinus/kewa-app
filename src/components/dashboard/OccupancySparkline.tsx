/**
 * OccupancySparkline Component
 *
 * SVG-based mini sparkline chart for displaying occupancy trends.
 * Uses pure CSS/SVG - no external charting library required.
 *
 * Phase 12-03: Occupancy Dashboard
 * Requirements: OCCU-04 (occupancy trend display)
 */

import { cn } from '@/lib/utils'

interface OccupancySparklineProps {
  /** Array of percentage values (0-100) to display */
  data: number[]
  /** Height of the sparkline in pixels */
  height?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * SVG sparkline visualization for occupancy trend data.
 *
 * Features:
 * - Polyline connecting data points
 * - Color-coded based on current value (green/amber/red)
 * - Baseline reference line
 * - Current value dot indicator
 *
 * @example
 * <OccupancySparkline data={[85, 88, 87, 91, 90, 92]} height={24} />
 */
export function OccupancySparkline({
  data,
  height = 32,
  className
}: OccupancySparklineProps) {
  // Need at least 2 points for a line
  if (data.length < 2) {
    return null
  }

  const width = data.length * 16
  const padding = 4
  const chartHeight = height - padding * 2
  const chartWidth = width - padding * 2

  // Calculate value range for normalization
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1 // Prevent division by zero

  // Build SVG polyline points string
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  // Current (most recent) value for color determination
  const currentValue = data[data.length - 1]

  // Color classes based on occupancy thresholds
  const strokeColor = currentValue >= 90
    ? 'stroke-green-500'
    : currentValue >= 70
    ? 'stroke-amber-500'
    : 'stroke-red-500'

  const fillColor = currentValue >= 90
    ? 'text-green-500'
    : currentValue >= 70
    ? 'text-amber-500'
    : 'text-red-500'

  // Calculate current value dot position
  const currentY = padding + chartHeight - ((currentValue - min) / range) * chartHeight

  return (
    <svg
      className={cn('flex-shrink-0', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Occupancy trend: ${data.join('%, ')}%`}
    >
      {/* Baseline reference line */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        className="stroke-gray-200 dark:stroke-gray-700"
        strokeWidth={1}
      />

      {/* Trend polyline */}
      <polyline
        fill="none"
        className={cn(strokeColor)}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {/* Current value indicator dot */}
      <circle
        cx={width - padding}
        cy={currentY}
        r={3}
        className={cn('fill-current', fillColor)}
      />
    </svg>
  )
}
