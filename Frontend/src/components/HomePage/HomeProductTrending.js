import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { StarIcon } from '@heroicons/react/20/solid'
import { FireIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { fetchProductsAction } from '../../redux/slices/products/productSlices'
import baseURL from '../../utils/baseURL'
import LoadingComponent from '../LoadingComp/LoadingComponent'

const DESCRIPTION_PREVIEW_LENGTH = 75

function productThumbUrl(url, large = false) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  const parts = url.split('/upload/')
  if (parts[1]?.startsWith('w_')) return url
  const transforms = large
    ? 'w_800,h_800,c_limit,q_auto:good,f_auto'
    : 'w_500,h_500,c_limit,q_auto:good,f_auto'
  return `${parts[0]}/upload/${transforms}/${parts[1]}`
}

const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function plainDescription(text) {
  if (!text) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getProductPath(product) {
  const id = product?._id || product?.id
  return `/products/${id}`
}

function ProductRatingRow({ rating }) {
  const value = Number(rating || 0)
  if (value > 0) {
    return (
      <div className="flex h-5 items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon
            key={i}
            className={`h-3.5 w-3.5 ${value > i ? 'text-amber-400' : 'text-stone-200'}`}
          />
        ))}
        <span className="ml-0.5 text-xs text-stone-500">{value}</span>
      </div>
    )
  }
  return <p className="h-5 text-xs text-stone-500">No rating available</p>
}

function ProductDescriptionSnippet({ description, productPath }) {
  const plain = plainDescription(description)
  const displayText = plain || 'No description available.'
  const isLong = displayText.length > DESCRIPTION_PREVIEW_LENGTH
  const preview = isLong
    ? `${displayText.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}…`
    : displayText

  return (
    <p className="mt-2 min-h-[2.75rem] text-xs leading-relaxed text-stone-600">
      {preview}
      {isLong && (
        <>
          {' '}
          <Link
            to={productPath}
            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            see more
          </Link>
        </>
      )}
    </p>
  )
}

function ViewProductButton({ to }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
    >
      View product
    </Link>
  )
}

function TrendingProductCard({ product, rank, featured = false }) {
  const productPath = getProductPath(product)
  const image = product?.images?.[0]
  const rating = product?.averageRating

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <Link
        to={productPath}
        className="group/image relative flex h-32 shrink-0 items-center justify-center bg-stone-50 p-3"
      >
        {featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            #1 Trending
          </span>
        )}
        {!featured && rank != null && rank <= 7 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
            #{rank}
          </span>
        )}
        {image ? (
          <img
            src={productThumbUrl(image, featured)}
            alt={product?.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition group-hover/image:scale-[1.02]"
          />
        ) : (
          <span className="text-xs text-stone-400">No image</span>
        )}
      </Link>

      <div className="flex min-h-[12.5rem] flex-1 flex-col border-t border-stone-100 p-3">
        <p className="min-h-[1rem] text-[10px] font-semibold uppercase tracking-wider text-indigo-600 sm:text-xs">
          {product?.brand || '\u00A0'}
        </p>

        <Link
          to={productPath}
          className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold capitalize leading-snug text-stone-900 hover:text-indigo-700"
        >
          {product?.name}
        </Link>

        <div className="mt-1.5">
          <ProductRatingRow rating={rating} />
        </div>

        <ProductDescriptionSnippet description={product?.description} productPath={productPath} />

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="text-base font-bold text-stone-900">{formatPrice(product?.price)}</p>
          <ViewProductButton to={productPath} />
        </div>
      </div>
    </article>
  )
}

export default function HomeProductTrending() {
  const dispatch = useDispatch()
  const productUrl = `${baseURL}/products?limit=7`

  useEffect(() => {
    dispatch(fetchProductsAction({ url: productUrl }))
  }, [dispatch])

  const productsState = useSelector((state) => state?.products)
  const loading = productsState?.loading
  const productList = productsState?.products?.products ?? []

  const sorted = useMemo(() => {
    return [...productList].sort(
      (a, b) => Number(b?.averageRating || 0) - Number(a?.averageRating || 0)
    )
  }, [productList])

  const [spotlight, ...rest] = sorted

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-800">
              <FireIcon className="h-3.5 w-3.5" />
              Hot picks
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Trending now
            </h2>
            <p className="mt-2 max-w-lg text-stone-600">
              Top-rated products from our catalog.
            </p>
          </div>
          <Link
            to="/products-filters"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:self-auto"
          >
            Shop all
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {loading && sorted.length === 0 ? (
          <div className="py-20">
            <LoadingComponent />
          </div>
        ) : sorted.length === 0 ? (
          <p className="mt-10 text-center text-stone-500">No products yet — check back soon.</p>
        ) : (
          <>
            <div className="mt-8 hidden items-stretch lg:grid lg:grid-cols-12 lg:gap-4">
              {spotlight && (
                <div className="lg:col-span-4">
                  <TrendingProductCard product={spotlight} rank={1} featured />
                </div>
              )}
              <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:col-span-8">
                {rest.slice(0, 6).map((product, index) => (
                  <TrendingProductCard
                    key={product._id || product.id}
                    product={product}
                    rank={index + 2}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:hidden">
              {sorted.slice(0, 6).map((product, index) => (
                <div
                  key={product._id || product.id}
                  className="w-[72vw] max-w-[17rem] shrink-0 snap-center"
                >
                  <TrendingProductCard
                    product={product}
                    rank={index + 1}
                    featured={index === 0}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
