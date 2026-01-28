'use client'

/**
 * Checklist Editor Component
 *
 * Editor for inspection template checklists with sections and items.
 * Phase: 22-inspection-core Plan 03
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ChecklistSection } from '@/types/inspections'

interface ChecklistEditorProps {
  initialSections: ChecklistSection[]
  onChange: (sections: ChecklistSection[]) => void
}

export function ChecklistEditor({ initialSections, onChange }: ChecklistEditorProps) {
  const [sections, setSections] = useState<ChecklistSection[]>(initialSections)

  const handleSectionsChange = (newSections: ChecklistSection[]) => {
    setSections(newSections)
    onChange(newSections)
  }

  const addSection = () => {
    const newSection: ChecklistSection = {
      id: crypto.randomUUID(),
      name: '',
      items: [],
    }
    handleSectionsChange([...sections, newSection])
  }

  const updateSection = (sectionId: string, name: string) => {
    handleSectionsChange(
      sections.map((s) =>
        s.id === sectionId ? { ...s, name } : s
      )
    )
  }

  const deleteSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (section && section.items.length > 0) {
      if (!confirm('Abschnitt enthält Elemente. Wirklich löschen?')) {
        return
      }
    }
    handleSectionsChange(sections.filter((s) => s.id !== sectionId))
  }

  const moveSectionUp = (index: number) => {
    if (index === 0) return
    const newSections = [...sections]
    ;[newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
    handleSectionsChange(newSections)
  }

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return
    const newSections = [...sections]
    ;[newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    handleSectionsChange(newSections)
  }

  const addItem = (sectionId: string) => {
    const newItem = {
      id: crypto.randomUUID(),
      title: '',
      description: null,
    }
    handleSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, newItem] }
          : s
      )
    )
  }

  const updateItem = (sectionId: string, itemId: string, field: 'title' | 'description', value: string) => {
    handleSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((item) =>
                item.id === itemId
                  ? { ...item, [field]: value || null }
                  : item
              ),
            }
          : s
      )
    )
  }

  const deleteItem = (sectionId: string, itemId: string) => {
    handleSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((item) => item.id !== itemId) }
          : s
      )
    )
  }

  const moveItemUp = (sectionId: string, itemIndex: number) => {
    if (itemIndex === 0) return
    handleSectionsChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s
        const newItems = [...s.items]
        ;[newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]]
        return { ...s, items: newItems }
      })
    )
  }

  const moveItemDown = (sectionId: string, itemIndex: number, totalItems: number) => {
    if (itemIndex === totalItems - 1) return
    handleSectionsChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s
        const newItems = [...s.items]
        ;[newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]]
        return { ...s, items: newItems }
      })
    )
  }

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div
          key={section.id}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
        >
          {/* Section header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1">
              <Label htmlFor={`section-${section.id}`}>Abschnitt {sectionIndex + 1}</Label>
              <Input
                id={`section-${section.id}`}
                value={section.name}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder="Abschnittsname..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-1 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveSectionUp(sectionIndex)}
                disabled={sectionIndex === 0}
                title="Nach oben"
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveSectionDown(sectionIndex)}
                disabled={sectionIndex === sections.length - 1}
                title="Nach unten"
              >
                ↓
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteSection(section.id)}
                title="Löschen"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 ml-4">
            {section.items.map((item, itemIndex) => (
              <div
                key={item.id}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1">
                    <Label htmlFor={`item-title-${item.id}`} className="text-xs">
                      Element {itemIndex + 1}
                    </Label>
                    <Input
                      id={`item-title-${item.id}`}
                      value={item.title}
                      onChange={(e) => updateItem(section.id, item.id, 'title', e.target.value)}
                      placeholder="Titel..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-1 mt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveItemUp(section.id, itemIndex)}
                      disabled={itemIndex === 0}
                      title="Nach oben"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveItemDown(section.id, itemIndex, section.items.length)}
                      disabled={itemIndex === section.items.length - 1}
                      title="Nach unten"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItem(section.id, item.id)}
                      title="Löschen"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`item-desc-${item.id}`} className="text-xs">
                    Beschreibung (optional)
                  </Label>
                  <Textarea
                    id={`item-desc-${item.id}`}
                    value={item.description || ''}
                    onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                    placeholder="Beschreibung..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => addItem(section.id)}
              className="w-full"
            >
              + Element hinzufügen
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={addSection} className="w-full">
        + Abschnitt hinzufügen
      </Button>
    </div>
  )
}
