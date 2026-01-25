'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  initialQuery?: string
  onSearch?: (query: string) => void
  showSuggestions?: boolean
  placeholder?: string
  className?: string
}

/**
 * Simple debounce function
 */
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Search bar component with autocomplete suggestions.
 * Debounces input for suggestions, submits on enter or button click.
 * German UI text.
 */
export function SearchBar({
  initialQuery = '',
  onSearch,
  showSuggestions = true,
  placeholder = 'Artikel suchen...',
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced fetch for suggestions
  const fetchSuggestions = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(
          `/api/knowledge/search/suggestions?q=${encodeURIComponent(term)}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
          setShowDropdown((data.suggestions || []).length > 0)
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  // Update suggestions when query changes
  useEffect(() => {
    if (showSuggestions) {
      fetchSuggestions(query)
    }
  }, [query, showSuggestions, fetchSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowDropdown(false)
    setSelectedIndex(-1)

    const searchQuery = query.trim()
    if (!searchQuery) return

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/dashboard/knowledge?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowDropdown(false)
    setSelectedIndex(-1)

    if (onSearch) {
      onSearch(suggestion)
    } else {
      router.push(`/dashboard/knowledge?q=${encodeURIComponent(suggestion)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault()
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          leftAdornment={<Search className="w-5 h-5" />}
          rightAdornment={
            query.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Suche loeschen"
              >
                <X className="w-4 h-4" />
              </button>
            ) : undefined
          }
          aria-label="Artikel suchen"
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'search-suggestions' : undefined}
          aria-expanded={showDropdown}
        />
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full px-4 py-2 text-left text-sm transition-colors',
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Search className="w-4 h-4 inline-block mr-2 opacity-50" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && showSuggestions && query.length >= 2 && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </form>
  )
}
