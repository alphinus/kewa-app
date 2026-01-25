'use client'

/**
 * Contractor Article Content
 *
 * Client component for rendering Tiptap content.
 * Simplified view without editing features.
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'

interface ContractorArticleContentProps {
  content: Record<string, unknown>
}

export default function ContractorArticleContent({
  content,
}: ContractorArticleContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      TiptapLink.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:no-underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false, // CRITICAL: Prevents SSR hydration errors
  })

  if (!editor) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    )
  }

  return (
    <EditorContent
      editor={editor}
      className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700"
    />
  )
}
