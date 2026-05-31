import { Link } from 'react-router-dom'
import { StarIcon } from '@heroicons/react/20/solid'

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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products?.map((product) => {
        const id = product?._id || product?.id
        const productPath = `/products/${id}`
        const image = product?.images?.[0] || product?.image
        const rating = Number(product?.averageRating || 0)
        const outOfStock = (product?.qtyLeft ?? 0) <= 0
        const lowStock = !outOfStock && product.qtyLeft <= 5

        return (
          <article
            key={id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <Link
              to={productPath}
              className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-b from-stone-50 to-white p-5"
            >
              {image ? (
                <img
                  src={productThumbUrl(image)}
                  alt={product?.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="text-sm text-stone-400">No image</span>
              )}
              {outOfStock && (
                <span className="absolute left-3 top-3 rounded-md bg-stone-900/80 px-2 py-1 text-xs font-medium text-white">
                  Sold out
                </span>
              )}
              {lowStock && (
                <span className="absolute left-3 top-3 rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white">
                  {product.qtyLeft} left
                </span>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-4 pt-3">
              {product?.brand && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                  {product.brand}
                </p>
              )}
              <Link
                to={productPath}
                className="mt-1 line-clamp-2 text-base font-semibold capitalize leading-snug text-stone-900 hover:text-indigo-700"
              >
                {product?.name}
              </Link>

              {rating > 0 && (
                <div className="mt-2 flex items-center gap-1">
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
                </div>
              )}

              <ProductDescriptionSnippet
                description={product?.description}
                productPath={productPath}
              />

              <div className="mt-auto flex items-center justify-between pt-3">
                <p className="text-lg font-bold text-stone-900">{formatPrice(product?.price)}</p>
                <Link
                  to={productPath}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View →
                </Link>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
