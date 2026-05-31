import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function ProductSearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search products…',
  className = '',
  inputId = 'product-search',
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const submit = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (onSearch) {
      onSearch(trimmed)
      return
    }
    if (!trimmed) {
      navigate('/products-filters')
      return
    }
    navigate(`/products-filters?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={submit} className={className} role="search">
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </form>
  )
}
