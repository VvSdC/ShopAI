import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { fetchProductSuggestions } from '../../../utils/productSearchSuggestions'

const SUGGEST_DEBOUNCE_MS = 280
const MIN_QUERY_LENGTH = 2

function suggestionImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url

  const transforms = 'w_80,h_80,c_fill,q_auto:good,f_auto'
  const parts = url.split('/upload/')
  if (parts.length !== 2 || parts[1].startsWith('w_')) return url
  return `${parts[0]}/upload/${transforms}/${parts[1]}`
}

function formatPrice(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

export default function ProductSearchBar({
  initialQuery = '',
  onSearch,
  categoryFilter = '',
  enableSuggestions = true,
  placeholder = 'Search products…',
  className = '',
  inputId = 'product-search',
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const listId = `${inputId}-suggestions`

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (!enableSuggestions) return undefined

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      setOpen(false)
      setActiveIndex(-1)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)

    const timer = window.setTimeout(async () => {
      try {
        const results = await fetchProductSuggestions(trimmed, {
          category: categoryFilter || undefined,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setSuggestions(results)
        setOpen(results.length > 0)
        setActiveIndex(-1)
      } catch (error) {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return
        setSuggestions([])
        setOpen(false)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, SUGGEST_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, categoryFilter, enableSuggestions])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const runSearch = useCallback(
    (value) => {
      const trimmed = value.trim()
      setOpen(false)
      setActiveIndex(-1)
      if (onSearch) {
        onSearch(trimmed)
        return
      }
      if (!trimmed) {
        navigate('/products-filters')
        return
      }
      navigate(`/products-filters?q=${encodeURIComponent(trimmed)}`)
    },
    [navigate, onSearch]
  )

  const goToProduct = useCallback(
    (suggestion) => {
      setOpen(false)
      setActiveIndex(-1)
      const path = suggestion.productUrl || `/products/${suggestion.id || suggestion._id}`
      navigate(path)
    },
    [navigate]
  )

  const submit = (e) => {
    e.preventDefault()
    if (open && activeIndex >= 0 && suggestions[activeIndex]) {
      goToProduct(suggestions[activeIndex])
      return
    }
    runSearch(query)
  }

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown =
    enableSuggestions && open && query.trim().length >= MIN_QUERY_LENGTH

  return (
    <form onSubmit={submit} className={className} role="search">
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <div ref={rootRef} className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim().length >= MIN_QUERY_LENGTH) {
              setOpen(true)
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0
              ? `${inputId}-suggestion-${activeIndex}`
              : undefined
          }
          className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        {showDropdown && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-80 overflow-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((item, index) => {
              const thumb = suggestionImageUrl(item.image || item.images?.[0])
              const isActive = index === activeIndex
              return (
                <li
                  key={item.id || item._id}
                  id={`${inputId}-suggestion-${index}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToProduct(item)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive ? 'bg-indigo-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <MagnifyingGlassIcon className="h-4 w-4 text-stone-400" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900">{item.name}</p>
                      <p className="truncate text-xs text-stone-500">
                        {[item.brand, item.category].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-stone-700">
                      {formatPrice(item.price)}
                    </span>
                  </button>
                </li>
              )
            })}
            <li className="border-t border-stone-100">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runSearch(query)}
                className="w-full px-3 py-2.5 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50"
              >
                View all results for “{query.trim()}”
              </button>
            </li>
          </ul>
        )}

        {enableSuggestions && loading && query.trim().length >= MIN_QUERY_LENGTH && !showDropdown && (
          <p className="pointer-events-none absolute left-0 right-0 top-[calc(100%+0.35rem)] rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500 shadow-sm">
            Searching…
          </p>
        )}
      </div>
    </form>
  )
}
