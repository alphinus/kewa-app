'use client'

import type { KBArticleTemplate } from '@/types/knowledge-base'

interface TemplateSelectorProps {
  value?: KBArticleTemplate
  onChange: (template: KBArticleTemplate) => void
  disabled?: boolean
}

/**
 * Template type selector for knowledge base articles
 * Displays FAQ, How-to, and Policy options with descriptions
 */
export function TemplateSelector({ value, onChange, disabled }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Artikeltyp wählen
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.type}
            template={template}
            selected={value === template.type}
            onClick={() => onChange(template.type)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: Template
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

function TemplateCard({ template, selected, onClick, disabled }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-4 rounded-lg border-2 text-left transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{template.icon}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {template.label}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {template.description}
      </p>
      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="font-medium">Abschnitte:</span>{' '}
        {template.sections.join(', ')}
      </div>
    </button>
  )
}

// Template definitions
interface Template {
  type: KBArticleTemplate
  label: string
  icon: string
  description: string
  sections: string[]
}

const TEMPLATES: Template[] = [
  {
    type: 'faq',
    label: 'FAQ',
    icon: '?',
    description: 'Frage-Antwort-Format für häufig gestellte Fragen',
    sections: ['Frage', 'Antwort', 'Verwandte Themen'],
  },
  {
    type: 'howto',
    label: 'Anleitung',
    icon: '#',
    description: 'Schritt-für-Schritt-Anleitung für Prozesse',
    sections: ['Überblick', 'Schritte', 'Tipps & Hinweise'],
  },
  {
    type: 'policy',
    label: 'Richtlinie',
    icon: '!',
    description: 'Offizielle Richtlinien und Regelungen',
    sections: ['Grundsatz', 'Geltungsbereich', 'Verantwortlichkeiten', 'Gültig ab'],
  },
]

/**
 * Get initial content structure for a template type
 * Returns Tiptap JSON content with placeholder sections
 */
export function getTemplateContent(template: KBArticleTemplate): Record<string, unknown> {
  switch (template) {
    case 'faq':
      return {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Frage' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Die häufig gestellte Frage hier eingeben...' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Antwort' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Die Antwort auf die Frage hier eingeben...' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Verwandte Themen' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Verwandtes Thema 1' }],
                  },
                ],
              },
            ],
          },
        ],
      }

    case 'howto':
      return {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Überblick' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Kurze Beschreibung des Prozesses oder der Aufgabe...' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Schritte' }],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Erster Schritt' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Zweiter Schritt' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Dritter Schritt' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Tipps & Hinweise' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Wichtige Tipps oder Warnungen hier einfügen...' }],
          },
        ],
      }

    case 'policy':
      return {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Grundsatz' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Die Richtlinie oder der Grundsatz hier beschreiben...' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Geltungsbereich' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Für wen und wann diese Richtlinie gilt...' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Verantwortlichkeiten' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Verantwortlichkeit 1' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Gültig ab' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Datum hier einfügen...' }],
          },
        ],
      }

    default:
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
          },
        ],
      }
  }
}

/**
 * Get German label for template type
 */
export function getTemplateLabel(template: KBArticleTemplate): string {
  const labels = {
    faq: 'FAQ',
    howto: 'Anleitung',
    policy: 'Richtlinie',
  }
  return labels[template] || template
}
