import { useEffect, useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import axiosInstance from '../../../utils/axiosInstance'
import Products from './Products'

export default function SimilarProductsSection({ productId }) {
  const [products, setProducts] = useState([])
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) {
      setProducts([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    axiosInstance
      .get(`/products/${productId}/similar`, { params: { limit: 8 } })
      .then(({ data }) => {
        if (cancelled) return
        setProducts(Array.isArray(data?.products) ? data.products : [])
        setMode(data?.mode || null)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

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
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            {mode === 'vector_neighbors'
              ? 'Grounded recommendations from our product catalog — matched by meaning, not guesswork.'
              : 'More from this category while we finish indexing embeddings.'}
          </p>
        </div>
      </div>
      <Products products={products} />
    </section>
  )
}
