import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { fetchCategoriesAction } from '../../redux/slices/categories/categoriesSlice'
import CategoryCard from './CategoryCard'
import LoadingComponent from '../LoadingComp/LoadingComponent'
import ErrorMsg from '../ErrorMsg/ErrorMsg'

function categoryProductCount(category) {
  return category?.productCount ?? 0
}

function sortByPopularity(list) {
  return [...list].sort((a, b) => categoryProductCount(b) - categoryProductCount(a))
}

export default function AllCategories() {
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')

  useEffect(() => {
    dispatch(fetchCategoriesAction())
  }, [dispatch])

  const { categories: categoriesPayload, loading, error } = useSelector(
    (state) => state?.categories
  )

  const allCategories = categoriesPayload?.categories ?? []

  const sorted = useMemo(() => sortByPopularity(allCategories), [allCategories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((c) => c.name?.toLowerCase().includes(q))
  }, [sorted, query])

  const featured = useMemo(() => sorted.slice(0, 4), [sorted])
  const totalProducts = useMemo(
    () => allCategories.reduce((sum, c) => sum + categoryProductCount(c), 0),
    [allCategories]
  )

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="text-xs text-stone-500">
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-stone-800">All categories</span>
          </nav>

          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                Departments
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Shop by category
              </h1>
              <p className="mt-2 max-w-xl text-sm text-stone-600 sm:text-base">
                Browse every department in one place and jump straight to the products you
                want.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Categories
                </p>
                <p className="text-lg font-bold text-stone-900">{allCategories.length}</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Products listed
                </p>
                <p className="text-lg font-bold text-stone-900">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Link
              to="/products-filters"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              View all products
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {error && (
          <div className="mb-6">
            <ErrorMsg message={error?.message || 'Could not load categories'} />
          </div>
        )}

        {loading ? (
          <div className="py-20">
            <LoadingComponent />
          </div>
        ) : allCategories.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white py-16 text-center shadow-sm">
            <Squares2X2Icon className="mx-auto h-12 w-12 text-stone-300" />
            <p className="mt-4 text-lg font-semibold text-stone-900">No categories yet</p>
            <p className="mt-2 text-sm text-stone-500">Check back soon for new departments.</p>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Sidebar — department list (desktop) */}
            <aside className="hidden lg:col-span-3 lg:block">
              <div
                className="sticky rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                style={{ top: 'calc(var(--shopai-navbar-height, 5rem) + 1rem)' }}
              >
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                  All departments
                </h2>
                <ul className="mt-3 max-h-[calc(100vh-12rem)] space-y-0.5 overflow-y-auto pr-1">
                  {sorted.map((category) => (
                    <li key={category._id || category.name}>
                      <Link
                        to={`/products-filters?category=${encodeURIComponent(category.name)}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm capitalize text-stone-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-stone-400">
                          {categoryProductCount(category)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="lg:col-span-9">
              {/* Featured departments */}
              {!query && featured.length > 0 && (
                <section className="mb-10">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-stone-900">Popular departments</h2>
                      <p className="mt-0.5 text-sm text-stone-500">
                        Most shopped categories right now
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featured.map((category) => (
                      <CategoryCard
                        key={category._id || category.name}
                        category={category}
                        featured
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Full grid */}
              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-stone-900">
                    {query ? `Results for “${query.trim()}”` : 'Browse all categories'}
                  </h2>
                  <span className="text-sm text-stone-500">
                    {filtered.length} {filtered.length === 1 ? 'category' : 'categories'}
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-white py-12 text-center">
                    <p className="text-stone-600">No categories match your search.</p>
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="mt-3 text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                    {filtered.map((category) => (
                      <CategoryCard key={category._id || category.name} category={category} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
