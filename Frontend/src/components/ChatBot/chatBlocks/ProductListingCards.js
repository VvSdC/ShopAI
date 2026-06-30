import { Link } from 'react-router-dom'
import { formatInr, stockBadge } from '../chatFormattingUtils'

function ProductListingCard({ product, index }) {
  const stock = stockBadge(product.qtyLeft, product.inStock)
  const url = product.productUrl || `/products/${product.id}`

  return (
    <Link
      to={url}
      className="group flex gap-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-stone-400">
            No img
          </div>
        )}
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900 group-hover:text-indigo-700">
          {product.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-stone-900">{formatInr(product.price)}</span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${stock.className}`}
          >
            {stock.label}
          </span>
        </div>
        {(product.brand || product.category) && (
          <p className="mt-1 truncate text-[11px] text-stone-500">
            {[product.brand, product.category].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function ProductListingCards({ products = [] }) {
  if (!products.length) return null

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-1">
      {products.map((product, index) => (
        <ProductListingCard key={product.id || index} product={product} index={index} />
      ))}
    </div>
  )
}
