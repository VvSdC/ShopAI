import { Fragment, useEffect, useMemo, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useDispatch, useSelector } from 'react-redux'
import { XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { FunnelIcon } from '@heroicons/react/20/solid'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import Products from './Products'
import ProductsSkeleton from './ProductsSkeleton'
import ShopPagination from './ShopPagination'
import PageSeo from '../../common/PageSeo'
import baseURL from '../../../utils/baseURL'
import { fetchProductsAction } from '../../../redux/slices/products/productSlices'
import { fetchBrandsAction } from '../../../redux/slices/categories/brandsSlice'
import { fetchColorsAction } from '../../../redux/slices/categories/colorsSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import NoDataFound from '../../NoDataFound/NoDataFound'
import ProductSearchBar from './ProductSearchBar'
import BrandFilterModal from './BrandFilterModal'
import ColorFilterModal from './ColorFilterModal'
import PriceRangeSlider, {
  PRICE_SLIDER_MIN,
  PRICE_SLIDER_MAX,
  isPriceFilterActive,
  formatPriceRangeLabel,
} from './PriceRangeSlider'

function ShopFiltersPanel({
  colors,
  brands,
  selectedColors,
  setSelectedColors,
  priceMin,
  priceMax,
  setPriceRange,
  selectedBrands,
  setSelectedBrands,
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Price
        </p>
        <PriceRangeSlider
          minValue={priceMin}
          maxValue={priceMax}
          onChange={setPriceRange}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Brand
        </p>
        <BrandFilterModal
          brands={brands}
          value={selectedBrands}
          onChange={setSelectedBrands}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Color
        </p>
        <ColorFilterModal
          colors={colors}
          value={selectedColors}
          onChange={setSelectedColors}
        />
      </div>
    </div>
  )
}

export default function ProductsFilters() {
  const dispatch = useDispatch()
  const location = useLocation()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const category = params.get('category')
  const searchQuery = (params.get('q') || '').trim()

  const [selectedColors, setSelectedColors] = useState([])
  const [priceMin, setPriceMin] = useState(PRICE_SLIDER_MIN)
  const [priceMax, setPriceMax] = useState(PRICE_SLIDER_MAX)
  const [appliedPriceMin, setAppliedPriceMin] = useState(PRICE_SLIDER_MIN)
  const [appliedPriceMax, setAppliedPriceMax] = useState(PRICE_SLIDER_MAX)
  const [selectedBrands, setSelectedBrands] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)

  const setPriceRange = (min, max) => {
    setPriceMin(min)
    setPriceMax(max)
    if (min === PRICE_SLIDER_MIN && max === PRICE_SLIDER_MAX) {
      setAppliedPriceMin(min)
      setAppliedPriceMax(max)
    }
  }

  const priceFilterActive = isPriceFilterActive(priceMin, priceMax)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedPriceMin(priceMin)
      setAppliedPriceMax(priceMax)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [priceMin, priceMax])

  const appliedPriceFilterActive = isPriceFilterActive(
    appliedPriceMin,
    appliedPriceMax
  )

  const buildProductUrl = () => {
    let url = `${baseURL}/products`
    if (category) url = `${baseURL}/products?category=${encodeURIComponent(category)}`

    const appendParam = (key, value) => {
      url += (url.includes('?') ? '&' : '?') + `${key}=${encodeURIComponent(value)}`
    }

    if (searchQuery) appendParam('q', searchQuery)
    selectedBrands.forEach((b) => appendParam('brand', b))
    selectedColors.forEach((c) => appendParam('color', c))
    if (appliedPriceFilterActive) appendParam('price', `${appliedPriceMin}-${appliedPriceMax}`)
    appendParam('page', String(page))
    appendParam('limit', String(limit))
    return url
  }

  const productUrl = buildProductUrl()

  const brandFilterKey = selectedBrands.join('|')
  const colorFilterKey = selectedColors.join('|')

  useEffect(() => {
    setPage(1)
  }, [category, brandFilterKey, colorFilterKey, appliedPriceMin, appliedPriceMax, limit, searchQuery])

  const handleSearch = (q) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next)
    setPage(1)
  }

  const clearSearch = () => handleSearch('')

  useEffect(() => {
    dispatch(fetchProductsAction({ url: productUrl }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dispatch, productUrl])

  useEffect(() => {
    dispatch(fetchBrandsAction({ url: productUrl }))
    dispatch(fetchColorsAction({ url: productUrl }))
  }, [dispatch, productUrl])

  const productsState = useSelector((state) => state?.products)
  const loading = productsState?.loading
  const error = productsState?.error
  const productList = productsState?.products?.products ?? []
  const total = productsState?.products?.total ?? 0

  const { brands: { brands } = {} } = useSelector((state) => state?.brands || {})
  const { colors: { colors } = {} } = useSelector((state) => state?.colors || {})

  const colorHexMap = useMemo(() => {
    const map = {}
    colors?.forEach((c) => {
      if (c?.name) map[c.name] = c.hex
    })
    return map
  }, [colors])

  const clearFilters = () => {
    setSelectedColors([])
    setPriceRange(PRICE_SLIDER_MIN, PRICE_SLIDER_MAX)
    setSelectedBrands([])
  }

  const hasFilters =
    !!(selectedColors.length || priceFilterActive || selectedBrands.length || searchQuery)
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1)
  const pageTitle = searchQuery
    ? `Results for “${searchQuery}”`
    : category
      ? category.replace(/-/g, ' ')
      : 'All products'
  const seoDescription = searchQuery
    ? `Search results for “${searchQuery}” on ShopAI.`
    : category
      ? `Browse ${category.replace(/-/g, ' ')} products on ShopAI.`
      : 'Browse all products on ShopAI — filter by brand, color, and price.'

  const filterProps = {
    colors,
    brands,
    selectedColors,
    setSelectedColors,
    priceMin,
    priceMax,
    setPriceRange,
    selectedBrands,
    setSelectedBrands,
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <PageSeo
        title={pageTitle}
        description={seoDescription}
        path={`${location.pathname}${location.search}`}
      />
      <main className="mx-auto w-full max-w-[90rem] px-4 py-6 pb-16 sm:px-6 lg:px-8 lg:py-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1 text-sm text-stone-500"
        >
          <Link to="/" className="hover:text-indigo-600">
            Home
          </Link>
          <ChevronRightIcon className="h-4 w-4 shrink-0" />
          <Link to="/products-filters" className="hover:text-indigo-600">
            Shop
          </Link>
          {category && (
            <>
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
              <span className="font-medium capitalize text-stone-800">{category}</span>
            </>
          )}
          {searchQuery && (
            <>
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
              <span className="font-medium text-stone-800">Search</span>
            </>
          )}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-stone-100 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold capitalize tracking-tight text-stone-900 sm:text-2xl">
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-stone-500">
                  {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'} found`}
                  {searchQuery && !loading ? ' · hybrid search' : ''}
                </p>
              </div>
              <ProductSearchBar
                initialQuery={searchQuery}
                onSearch={handleSearch}
                categoryFilter={category || ''}
                className="w-full lg:max-w-md lg:shrink-0"
                inputId="products-page-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                to="/all-categories"
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
              >
                Categories
              </Link>
              {category && (
                <Link
                  to="/products-filters"
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                >
                  All products
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 lg:hidden"
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          {(hasFilters || category) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-4 py-3 sm:px-6">
              {searchQuery && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200">
                  <span className="truncate">“{searchQuery}”</span>
                  <button type="button" onClick={clearSearch} aria-label="Clear search">
                    <XMarkIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                  </button>
                </span>
              )}
              {category && (
                <Link
                  to="/products-filters"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm capitalize text-stone-700 ring-1 ring-stone-200 hover:ring-indigo-300"
                >
                  {category}
                  <XMarkIcon className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                </Link>
              )}
              {selectedBrands.map((brandName) => (
                <span
                  key={brandName}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm capitalize text-stone-700 ring-1 ring-stone-200"
                >
                  {brandName}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBrands((prev) => prev.filter((b) => b !== brandName))
                    }
                    aria-label={`Remove ${brandName}`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5 text-stone-400" />
                  </button>
                </span>
              ))}
              {selectedColors.map((colorName) => (
                <span
                  key={colorName}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm capitalize text-stone-700 ring-1 ring-stone-200"
                >
                  <span
                    style={{ backgroundColor: colorHexMap[colorName] || colorName }}
                    className="h-3 w-3 shrink-0 rounded-full border border-stone-300"
                    aria-hidden
                  />
                  {colorName}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedColors((prev) => prev.filter((c) => c !== colorName))
                    }
                    aria-label={`Remove ${colorName}`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5 text-stone-400" />
                  </button>
                </span>
              ))}
              {priceFilterActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200">
                  {formatPriceRangeLabel(priceMin, priceMax)}
                  <button
                    type="button"
                    onClick={() => setPriceRange(PRICE_SLIDER_MIN, PRICE_SLIDER_MAX)}
                    aria-label="Remove price filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5 text-stone-400" />
                  </button>
                </span>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className="lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
            {/* Sidebar filters — compact, no inner scroll */}
            <aside className="hidden border-b border-stone-100 bg-stone-50/30 lg:block lg:border-b-0 lg:border-r">
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-stone-900">Filters</h2>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <ShopFiltersPanel {...filterProps} />
                <div className="mt-6 space-y-2 border-t border-stone-200 pt-5">
                  <Link
                    to="/all-categories"
                    className="block text-sm font-medium text-stone-600 hover:text-indigo-600"
                  >
                    Browse categories →
                  </Link>
                  {category && (
                    <Link
                      to="/products-filters"
                      className="block text-sm font-medium text-stone-600 hover:text-indigo-600"
                    >
                      View all products →
                    </Link>
                  )}
                </div>
              </div>
            </aside>

            {/* Product grid */}
            <div className="min-w-0 p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <span>Per page</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                  </select>
                </label>
              </div>

              {loading ? (
                <ProductsSkeleton count={limit >= 30 ? 12 : 8} />
              ) : error ? (
                <ErrorMsg message={error?.message} />
              ) : productList.length <= 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 px-6 py-16 text-center">
                  <NoDataFound />
                  {searchQuery && (
                    <p className="mt-3 text-sm text-stone-500">
                      No matches for “{searchQuery}”. Try different keywords or clear filters.
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Clear search
                      </button>
                    )}
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          clearFilters()
                          if (searchQuery) clearSearch()
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Clear filters
                      </button>
                    )}
                    <Link
                      to="/all-categories"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Browse categories →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <Products products={productList} />
                  {!searchQuery && (
                    <ShopPagination
                      page={page}
                      totalPages={totalPages}
                      total={total}
                      limit={limit}
                      loading={loading}
                      onPageChange={setPage}
                    />
                  )}
                  {searchQuery && total > limit && (
                    <p className="mt-6 text-center text-sm text-stone-500">
                      Showing top {Math.min(limit, total)} matches. Refine your search or use filters to narrow results.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filters drawer */}
      <Transition.Root show={mobileFiltersOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileFiltersOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex justify-end">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-stone-900">Filters</h2>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-6">
                  <ShopFiltersPanel {...filterProps} />
                </div>
                <div className="border-t border-stone-200 p-4">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Show results
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  )
}
