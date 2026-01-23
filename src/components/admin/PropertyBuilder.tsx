'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UnitEditor } from './UnitEditor'
import type { Building, Unit } from '@/types/database'
import type { UnitType } from '@/types'

// =============================================
// TYPES
// =============================================

interface PropertyBuilderProps {
  building: Building
  onSave: () => void
}

interface DragItem {
  type: UnitType
  label: string
  icon: string
}

interface GridCell {
  floor: number
  position: number
  unit: Unit | null
}

// Available unit types for dragging
const UNIT_TYPES: DragItem[] = [
  { type: 'apartment', label: 'Wohnung', icon: '🏠' },
  { type: 'common_area', label: 'Gemeinschaft', icon: '🚪' },
]

// Floor labels mapping
const FLOOR_LABELS: Record<number, string> = {
  '-1': 'UG',
  '0': 'EG',
  '1': '1.OG',
  '2': '2.OG',
  '3': '3.OG',
  '4': '4.OG',
  '5': '5.OG',
}

// =============================================
// COMPONENT
// =============================================

/**
 * PropertyBuilder - Visual drag-and-drop interface for building management
 *
 * Features:
 * - Visual grid layout showing floors and positions
 * - Drag-and-drop to add new units
 * - Click on unit to edit
 * - Add/remove floors dynamically
 * - Responsive grid that adapts to unit count per floor
 */
export function PropertyBuilder({ building, onSave }: PropertyBuilderProps) {
  // State
  const [units, setUnits] = useState<Unit[]>([])
  const [floors, setFloors] = useState<number[]>([])
  const [maxPositions, setMaxPositions] = useState(4)
  const [loading, setLoading] = useState(true)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  /**
   * Load units from API
   */
  useEffect(() => {
    loadUnits()
  }, [building.id])

  /**
   * Fetch units and organize into grid structure
   */
  async function loadUnits() {
    try {
      setLoading(true)
      const response = await fetch('/api/units')
      if (!response.ok) throw new Error('Failed to fetch units')

      const data = await response.json()
      const buildingUnits = data.units.filter(
        (u: Unit) => u.building_id === building.id && u.unit_type !== 'building'
      )

      setUnits(buildingUnits)

      // Calculate floor range and max positions
      const floorNums = buildingUnits
        .map((u: Unit) => u.floor)
        .filter((f: number | null): f is number => f !== null)

      if (floorNums.length > 0) {
        const minFloor = Math.min(...floorNums)
        const maxFloor = Math.max(...floorNums)
        const floorRange = []
        for (let i = maxFloor; i >= minFloor; i--) {
          floorRange.push(i)
        }
        setFloors(floorRange)

        // Calculate max positions per floor
        const positionCounts = buildingUnits
          .filter((u: Unit) => u.floor !== null)
          .reduce((acc: Record<number, number>, u: Unit) => {
            const floor = u.floor!
            const posNum = parseInt(u.position || '0', 10)
            acc[floor] = Math.max(acc[floor] || 0, posNum + 1)
            return acc
          }, {})

        const maxPos = Math.max(...(Object.values(positionCounts) as number[]), 4)
        setMaxPositions(maxPos)
      } else {
        // Default floor layout
        setFloors([3, 2, 1, 0, -1])
        setMaxPositions(4)
      }
    } catch (error) {
      console.error('Error loading units:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle drag start from sidebar
   */
  function handleDragStart(e: React.DragEvent, item: DragItem) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('unitType', item.type)
    e.dataTransfer.setData('action', 'create')
  }

  /**
   * Handle drag start from existing unit
   */
  function handleUnitDragStart(e: React.DragEvent, unit: Unit) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('unitId', unit.id)
    e.dataTransfer.setData('action', 'move')
  }

  /**
   * Handle drag over grid cell
   */
  function handleDragOver(e: React.DragEvent, floor: number, position: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverCell(`${floor}-${position}`)
  }

  /**
   * Handle drag leave
   */
  function handleDragLeave() {
    setDragOverCell(null)
  }

  /**
   * Handle drop on grid cell
   */
  async function handleDrop(e: React.DragEvent, floor: number, position: number) {
    e.preventDefault()
    setDragOverCell(null)

    const action = e.dataTransfer.getData('action')

    if (action === 'create') {
      // Create new unit
      const unitType = e.dataTransfer.getData('unitType') as UnitType
      await createUnit(unitType, floor, position)
    } else if (action === 'move') {
      // Move existing unit
      const unitId = e.dataTransfer.getData('unitId')
      await moveUnit(unitId, floor, position)
    }
  }

  /**
   * Create new unit at position
   */
  async function createUnit(unitType: UnitType, floor: number, position: number) {
    try {
      const name = generateUnitName(unitType, floor, position)

      const response = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: building.id,
          name,
          unit_type: unitType,
          floor,
          position: position.toString(),
          tenant_visible_to_imeri: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to create unit')

      await loadUnits()
      onSave()
    } catch (error) {
      console.error('Error creating unit:', error)
      alert('Fehler beim Erstellen der Einheit')
    }
  }

  /**
   * Move unit to new position
   */
  async function moveUnit(unitId: string, floor: number, position: number) {
    try {
      const response = await fetch(`/api/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floor,
          position: position.toString(),
        }),
      })

      if (!response.ok) throw new Error('Failed to move unit')

      await loadUnits()
      onSave()
    } catch (error) {
      console.error('Error moving unit:', error)
      alert('Fehler beim Verschieben der Einheit')
    }
  }

  /**
   * Generate default unit name based on type and position
   */
  function generateUnitName(
    unitType: UnitType,
    floor: number,
    position: number
  ): string {
    const floorLabel = FLOOR_LABELS[floor] || `${floor}.OG`

    if (unitType === 'apartment') {
      const positions = ['Links', 'Mitte', 'Rechts']
      const posLabel = positions[position] || `Pos ${position + 1}`
      return `${floorLabel} ${posLabel}`
    }

    return `${floorLabel} Raum ${position + 1}`
  }

  /**
   * Get unit at specific floor/position
   */
  function getUnitAt(floor: number, position: number): Unit | null {
    return (
      units.find(
        (u) => u.floor === floor && u.position === position.toString()
      ) || null
    )
  }

  /**
   * Handle unit click to edit
   */
  function handleUnitClick(unit: Unit) {
    setEditingUnit(unit)
  }

  /**
   * Handle unit save
   */
  async function handleUnitSave() {
    setEditingUnit(null)
    await loadUnits()
    onSave()
  }

  /**
   * Handle unit delete
   */
  async function handleUnitDelete() {
    setEditingUnit(null)
    await loadUnits()
    onSave()
  }

  /**
   * Add new floor above
   */
  function addFloorAbove() {
    const maxFloor = Math.max(...floors)
    setFloors([maxFloor + 1, ...floors])
  }

  /**
   * Add new floor below
   */
  function addFloorBelow() {
    const minFloor = Math.min(...floors)
    setFloors([...floors, minFloor - 1])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lädt...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Gebäude: {building.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ziehen Sie Elemente auf die Grid-Felder oder klicken Sie auf
            bestehende Einheiten zum Bearbeiten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addFloorAbove} size="sm">
            + Stockwerk oben
          </Button>
          <Button variant="secondary" onClick={addFloorBelow} size="sm">
            + Stockwerk unten
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-x-auto">
        <div className="min-w-[640px]">
          {floors.map((floor) => (
            <div
              key={floor}
              className="flex items-stretch border-b border-gray-200 dark:border-gray-800 last:border-b-0"
            >
              {/* Floor Label */}
              <div className="flex items-center justify-center w-20 py-3 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-800 font-medium text-gray-700 dark:text-gray-300">
                {FLOOR_LABELS[floor] || `${floor}.OG`}
              </div>

              {/* Grid Cells */}
              <div className="flex-1 flex">
                {Array.from({ length: maxPositions }, (_, i) => {
                  const unit = getUnitAt(floor, i)
                  const cellId = `${floor}-${i}`
                  const isDragOver = dragOverCell === cellId

                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[120px] p-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0 transition-colors ${
                        isDragOver
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-white dark:bg-gray-900'
                      }`}
                      onDragOver={(e) => handleDragOver(e, floor, i)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, floor, i)}
                    >
                      {unit ? (
                        <div
                          draggable
                          onDragStart={(e) => handleUnitDragStart(e, unit)}
                          onClick={() => handleUnitClick(unit)}
                          className="h-full min-h-[60px] flex flex-col items-center justify-center gap-1 p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer transition-colors border border-blue-300 dark:border-blue-700"
                        >
                          <div className="text-2xl">
                            {unit.unit_type === 'apartment' ? '🏠' : '🚪'}
                          </div>
                          <div className="text-xs font-medium text-center text-gray-900 dark:text-gray-100 line-clamp-2">
                            {unit.name}
                          </div>
                          {unit.tenant_name && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                              {unit.tenant_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 text-xs">
                          Leer
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drag Items Sidebar */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Drag items:
        </div>
        <div className="flex gap-3">
          {UNIT_TYPES.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 cursor-move hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Editor Modal */}
      {editingUnit && (
        <UnitEditor
          unit={editingUnit}
          onSave={handleUnitSave}
          onDelete={handleUnitDelete}
          onCancel={() => setEditingUnit(null)}
        />
      )}
    </div>
  )
}
