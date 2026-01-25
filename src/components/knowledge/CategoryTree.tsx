'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { KBCategoryWithCount } from '@/types/knowledge-base'

interface CategoryTreeProps {
  selectedCategoryId?: string
  showEmpty?: boolean
}

/**
 * Helper to find a category in the tree by ID
 */
function findCategory(
  categories: KBCategoryWithCount[],
  id: string
): KBCategoryWithCount | null {
  for (const cat of categories) {
    if (cat.id === id) return cat
    if (cat.children) {
      const found = findCategory(cat.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Collapsible category tree navigation for the knowledge base.
 * Displays two-level hierarchy with article counts.
 * Admin sees all categories, users see only populated ones.
 */
export function CategoryTree({ selectedCategoryId, showEmpty = false }: CategoryTreeProps) {
  const [categories, setCategories] = useState<KBCategoryWithCount[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/knowledge/categories?include_empty=${showEmpty}`)
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || [])
        // Auto-expand parent of selected category
        if (selectedCategoryId) {
          const selected = findCategory(data.categories || [], selectedCategoryId)
          if (selected?.parent_id) {
            setExpanded(new Set([selected.parent_id]))
          }
        }
      })
      .catch(err => {
        console.error('Failed to load categories:', err)
      })
      .finally(() => setLoading(false))
  }, [showEmpty, selectedCategoryId])

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  if (loading) {
    return (
      <nav className="space-y-1 animate-pulse">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
      </nav>
    )
  }

  return (
    <nav className="space-y-1">
      {/* "Alle Artikel" link at top */}
      <Link
        href="/dashboard/knowledge"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          !selectedCategoryId
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        )}
      >
        <FileText className="w-4 h-4" />
        <span className="flex-1">Alle Artikel</span>
      </Link>

      {/* Render top-level categories */}
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          selectedId={selectedCategoryId}
          expanded={expanded}
          onToggle={toggleExpand}
        />
      ))}

      {/* Empty state */}
      {categories.length === 0 && (
        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Keine Kategorien vorhanden
        </p>
      )}
    </nav>
  )
}

interface CategoryItemProps {
  category: KBCategoryWithCount
  selectedId?: string
  expanded: Set<string>
  onToggle: (id: string, e: React.MouseEvent) => void
  level?: number
}

/**
 * Individual category item with optional children
 */
function CategoryItem({
  category,
  selectedId,
  expanded,
  onToggle,
  level = 0,
}: CategoryItemProps) {
  const hasChildren = category.children && category.children.length > 0
  const isExpanded = expanded.has(category.id)
  const isSelected = category.id === selectedId

  return (
    <div>
      <Link
        href={`/dashboard/knowledge/category/${category.id}`}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          level > 0 && 'ml-4',
          isSelected
            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        )}
      >
        {/* Expand/collapse button for parent categories */}
        {hasChildren ? (
          <button
            onClick={(e) => onToggle(category.id, e)}
            className="p-0.5 -ml-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label={isExpanded ? 'Kategorie zuklappen' : 'Kategorie aufklappen'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Folder icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-gray-400" />
        ) : (
          <Folder className="w-4 h-4 text-gray-400" />
        )}

        {/* Category name */}
        <span className="flex-1 truncate">{category.name}</span>

        {/* Article count badge */}
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-full',
            isSelected
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          )}
        >
          {category.article_count}
        </span>
      </Link>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {category.children!.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
