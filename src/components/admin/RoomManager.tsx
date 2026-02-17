'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Room } from '@/types/database'
import type { RoomType, RoomCondition } from '@/types'

interface RoomManagerProps {
  unitId: string
  rooms: Room[]
  onRoomsUpdated: () => void
}

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'bathroom', label: 'Badezimmer' },
  { value: 'kitchen', label: 'Küche' },
  { value: 'bedroom', label: 'Schlafzimmer' },
  { value: 'living_room', label: 'Wohnzimmer' },
  { value: 'hallway', label: 'Flur' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'storage', label: 'Abstellraum' },
  { value: 'laundry', label: 'Waschküche' },
  { value: 'office', label: 'Buero' },
  { value: 'other', label: 'Sonstiges' }
]

const CONDITIONS: { value: RoomCondition; label: string; color: string }[] = [
  { value: 'new', label: 'Neu', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'partial', label: 'Teilsaniert', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'old', label: 'Alt', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
]

/**
 * RoomManager - Manages rooms within a unit
 * Allows adding, editing, and removing rooms
 */
export function RoomManager({ unitId, rooms, onRoomsUpdated }: RoomManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState<RoomType>('living_room')
  const [newRoomCondition, setNewRoomCondition] = useState<RoomCondition>('old')
  const [saving, setSaving] = useState(false)

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/units/${unitId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          room_type: newRoomType,
          condition: newRoomCondition
        })
      })

      if (!response.ok) throw new Error('Failed to add room')

      setNewRoomName('')
      setShowAddForm(false)
      onRoomsUpdated()
    } catch (error) {
      console.error('Error adding room:', error)
      toast.error('Fehler beim Hinzufügen des Raums')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Raum wirklich löschen?')) return

    try {
      const response = await fetch(`/api/units/${unitId}/rooms/${roomId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete room')

      onRoomsUpdated()
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error('Fehler beim Löschen des Raums')
    }
  }

  async function handleConditionChange(roomId: string, condition: RoomCondition) {
    try {
      const response = await fetch(`/api/units/${unitId}/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      })

      if (!response.ok) throw new Error('Failed to update room')

      onRoomsUpdated()
    } catch (error) {
      console.error('Error updating room:', error)
      toast.error('Fehler beim Aktualisieren des Raums')
    }
  }

  return (
    <div className="space-y-4">
      {/* Rooms list */}
      {rooms.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p>Keine Räume vorhanden</p>
          <p className="text-sm mt-1">Fügen Sie Räume hinzu um den Zustand zu verfolgen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(room => {
            const typeLabel = ROOM_TYPES.find(t => t.value === room.room_type)?.label || room.room_type
            const conditionInfo = CONDITIONS.find(c => c.value === room.condition) || CONDITIONS[2]

            return (
              <div
                key={room.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {room.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {typeLabel}
                  </div>
                </div>

                <select
                  value={room.condition || 'old'}
                  onChange={e => handleConditionChange(room.id, e.target.value as RoomCondition)}
                  className={`px-2 py-1 rounded text-xs font-medium ${conditionInfo.color} border-0 focus:ring-2 focus:ring-blue-500`}
                >
                  {CONDITIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Raum löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add room form */}
      {showAddForm ? (
        <form onSubmit={handleAddRoom} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Raumname
            </label>
            <input
              type="text"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              placeholder="z.B. Wohnzimmer, Bad 1"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Typ
              </label>
              <select
                value={newRoomType}
                onChange={e => setNewRoomType(e.target.value as RoomType)}
                className="w-full px-2 py-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                {ROOM_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zustand
              </label>
              <select
                value={newRoomCondition}
                onChange={e => setNewRoomCondition(e.target.value as RoomCondition)}
                className="w-full px-2 py-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                {CONDITIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving}>
              Hinzufügen
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Raum hinzufügen
        </Button>
      )}
    </div>
  )
}
