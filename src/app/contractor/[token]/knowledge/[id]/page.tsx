/**
 * Contractor Portal Article View
 *
 * Displays a single contractor-visible article with simplified UI.
 * Hides internal metadata per CONTEXT.md: no author, dates, version history.
 *
 * Shows: title, content, category, attachments
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'
import TokenError from '../../token-error'
import RequestLinkForm from '../../request-link-form'
import ContractorArticleContent from './article-content'

interface ContractorArticlePageProps {
  params: Promise<{ token: string; id: string }>
}

export default async function ContractorArticlePage({
  params,
}: ContractorArticlePageProps) {
  const { token, id } = await params

  // Validate contractor token
  const validation = await validateContractorAccess(token)

  if (!validation.valid) {
    if (validation.error === 'expired' || validation.error === 'work_order_closed') {
      return <RequestLinkForm error={validation.error} />
    }
    return <TokenError error={validation.error ?? 'not_found'} />
  }

  const supabase = await createClient()

  // Fetch article with visibility check
  const { data: article, error } = await supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      content,
      category_id,
      tags,
      category:kb_categories (
        id,
        name
      )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .in('visibility', ['contractors', 'both'])
    .single()

  if (error || !article) {
    notFound()
  }

  // Extract category name (Supabase returns single relation as object but types as array)
  const categoryData = article.category as unknown as { id: string; name: string } | null
  const categoryName = categoryData?.name || null
  const tags = (article.tags || []) as string[]

  // Fetch attachments for this article
  const { data: attachments } = await supabase
    .from('kb_attachments')
    .select('id, file_name, file_size, mime_type, storage_path, description')
    .eq('article_id', id)
    .order('created_at', { ascending: true })

  // Generate signed URLs for attachments
  const attachmentsWithUrls = await Promise.all(
    (attachments || []).map(async (attachment) => {
      const { data: urlData } = await supabase.storage
        .from('kb-attachments')
        .createSignedUrl(attachment.storage_path, 3600) // 1 hour

      return {
        ...attachment,
        url: urlData?.signedUrl || null,
      }
    })
  )

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/contractor/${token}/knowledge`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Zurück zur Wissensdatenbank
      </Link>

      {/* Article card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        {/* Header */}
        <header className="space-y-3 mb-6">
          <h1 className="text-xl font-bold text-gray-900">{article.title}</h1>

          {/* Category badge */}
          {categoryName && (
            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {categoryName}
            </span>
          )}
        </header>

        {/* Content - client component for Tiptap */}
        <div className="border-t border-gray-200 pt-6">
          <ContractorArticleContent content={article.content} />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-200">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      {attachmentsWithUrls.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            Anhaenge
          </h2>
          <ul className="space-y-2">
            {attachmentsWithUrls.map((attachment) => (
              <li key={attachment.id}>
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <FileIcon mimeType={attachment.mime_type} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </p>
                      {attachment.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {attachment.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 opacity-50">
                    <FileIcon mimeType={attachment.mime_type} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-gray-400">Nicht verfügbar</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back to dashboard */}
      <div className="pt-4 border-t border-gray-200">
        <Link
          href={`/contractor/${token}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zu meinen Aufträgen
        </Link>
      </div>
    </div>
  )
}

function FileIcon({ mimeType }: { mimeType: string }) {
  // PDF
  if (mimeType === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6a2 2 0 002 2h6v8H6z" />
      </svg>
    )
  }

  // Images
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    )
  }

  // Default file
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
