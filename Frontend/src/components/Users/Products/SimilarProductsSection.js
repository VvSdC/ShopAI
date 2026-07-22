import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { fetchSimilarProductsAction } from '../../../redux/slices/products/productSlices'
import Products from './Products'

export default function SimilarProductsSection({ productId }) {
  const dispatch = useDispatch()
  const productKey = productId ? String(productId) : ''

  const { similarByProductId, similarFetching, similarFetchKey } = useSelector(
    (state) => state?.products ?? {}
  )

  const cached = productKey ? similarByProductId?.[productKey] : null
  const products = cached?.products ?? []
  const mode = cached?.mode ?? null
  const loading =
    Boolean(productKey) &&
    !cached &&
    similarFetching &&
    similarFetchKey === productKey

  useEffect(() => {
    if (!productKey) return
    dispatch(fetchSimilarProductsAction({ productId: productKey }))
  }, [dispatch, productKey])

  const subtitle = useMemo(() => {
    if (mode === 'vector_neighbors') {
      return 'Grounded recommendations from our product catalog — matched by meaning, not guesswork.'
    }
    if (mode === 'category_fallback') {
      return 'Popular picks in this category.'
    }
    return null
  }, [mode])

  if (loading) {
    return (
      <section className="mt-8 animate-fade-up rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 h-7 w-48 animate-pulse rounded-lg bg-stone-200" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </section>
    )
  }

  if (!products.length) return null

  return (
    <section
      aria-labelledby="similar-products-heading"
      className="mt-8 animate-fade-up rounded-2xl border border-indigo-100/80 bg-gradient-to-b from-indigo-50/40 to-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">ShopAI picks</span>
          </div>
          <h2 id="similar-products-heading" className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">
            You may also like
          </h2>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-stone-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <Products products={products} />
    </section>
  )
}
