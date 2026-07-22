import { Link } from 'react-router-dom'
import { StarIcon } from '@heroicons/react/20/solid'
import WishlistButton from './WishlistButton'

const DESCRIPTION_PREVIEW_LENGTH = 110

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function productThumbUrl(url) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  const parts = url.split('/upload/')
  if (parts[1]?.startsWith('w_')) return url
  return `${parts[0]}/upload/w_500,h_500,c_limit,q_auto:good,f_auto/${parts[1]}`
}

const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function plainDescription(text) {
  if (!text) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ProductDescriptionSnippet({ description, productPath }) {
  const plain = plainDescription(description)
  const displayText = plain || 'No description available.'
  const isLong = displayText.length > DESCRIPTION_PREVIEW_LENGTH
  const preview = isLong
    ? `${displayText.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}…`
    : displayText

  return (
    <p className="mt-2 text-xs leading-relaxed text-stone-600">
      {preview}
      {isLong && (
        <>
          {' '}
          <Link
            to={productPath}
            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Show more
          </Link>
        </>
      )}
    </p>
  )
}

export default function Products({ products }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products?.map((product, index) => {
        const id = product?._id || product?.id
        const productPath = `/products/${id}`
        const image = product?.images?.[0] || product?.image
        const rating = Number(product?.averageRating || 0)
        const outOfStock = (product?.qtyLeft ?? 0) <= 0
        const lowStock = !outOfStock && product.qtyLeft <= 5

        return (
          <article
            key={id}
            style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
            className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100"
          >
            <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-b from-stone-50 to-white p-4 sm:aspect-[4/5] sm:p-5">
              <div className="absolute right-3 top-3 z-10">
                <WishlistButton product={product} />
              </div>
              <Link to={productPath} className="flex h-full w-full items-center justify-center">
                {image ? (
                  <img
                    src={productThumbUrl(image)}
                    alt={product?.name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : (
                  <span className="text-sm text-stone-400">No image</span>
                )}
              </Link>
              {outOfStock && (
                <span className="absolute left-3 top-3 rounded-md bg-stone-900/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  Sold out
                </span>
              )}
              {lowStock && (
                <span className="absolute left-3 top-3 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                  {product.qtyLeft} left
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-3 pt-2.5 sm:p-4 sm:pt-3">
              <p className="min-h-[1rem] text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                {product?.brand || '\u00A0'}
              </p>
              <Link
                to={productPath}
                className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold capitalize leading-snug text-stone-900 hover:text-indigo-700 sm:text-base"
              >
                {product?.name}
              </Link>

              <div className="mt-1.5 flex h-4 items-center gap-1">
                {rating > 0 ? (
                  <>
                    <div className="flex">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <StarIcon
                          key={i}
                          className={classNames(
                            rating > i ? 'text-amber-400' : 'text-stone-200',
                            'h-3.5 w-3.5'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500">{rating}</span>
                  </>
                ) : (
                  <span className="text-xs text-stone-400">No reviews yet</span>
                )}
              </div>

              <div className="hidden sm:block">
                <ProductDescriptionSnippet
                  description={product?.description}
                  productPath={productPath}
                />
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <p className="text-base font-bold text-stone-900 sm:text-lg">
                  {formatPrice(product?.price)}
                </p>
                <Link
                  to={productPath}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  View
                </Link>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
