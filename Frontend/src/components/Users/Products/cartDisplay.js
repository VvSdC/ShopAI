import { Link } from 'react-router-dom'
import { TruckIcon } from '@heroicons/react/24/outline'

export const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
export const FREE_DELIVERY_THRESHOLD = 999
export const DESCRIPTION_PREVIEW_LENGTH = 185

export function plainDescription(text) {
  if (!text) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ProductDescriptionSnippet({ description, productPath, className = '' }) {
  const plain = plainDescription(description)
  if (!plain) return null

  const isLong = plain.length > DESCRIPTION_PREVIEW_LENGTH
  const preview = isLong
    ? `${plain.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}…`
    : plain

  return (
    <p className={`text-xs leading-relaxed text-stone-500 ${className}`}>
      {preview}
      {isLong && (
        <>
          {' '}
          <Link
            to={productPath}
            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            See more
          </Link>
        </>
      )}
    </p>
  )
}

export function getStockStatus(product) {
  if (product.unavailable) {
    return {
      label: 'Not available',
      tone: 'unavailable',
      detail: product.reason,
    }
  }

  const qtyLeft = Number(product.qtyLeft)
  if (Number.isFinite(qtyLeft)) {
    if (qtyLeft <= 0) {
      return { label: 'Out of stock', tone: 'unavailable', detail: product.reason }
    }
    if (product.adjusted) {
      return {
        label: 'Limited stock',
        tone: 'low',
        detail: product.reason || `Only ${qtyLeft} left in stock`,
      }
    }
    if (qtyLeft <= 5) {
      return { label: `Only ${qtyLeft} left`, tone: 'low' }
    }
    return { label: 'In stock', tone: 'inStock' }
  }

  return { label: 'In stock', tone: 'inStock' }
}

const stockToneStyles = {
  inStock: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  low: 'border-amber-200 bg-amber-50 text-amber-900',
  unavailable: 'border-red-200 bg-red-50 text-red-800',
}

export function StockStatusBadge({ product }) {
  const status = getStockStatus(product)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stockToneStyles[status.tone]}`}
      title={status.detail}
    >
      {status.label}
    </span>
  )
}

export function DeliveryProgress({ subtotal }) {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <TruckIcon className="h-5 w-5 shrink-0" />
        <span>Your order qualifies for standard delivery</span>
      </div>
    )
  }
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-sm text-stone-700">
        Add <span className="font-semibold text-stone-900">{formatPrice(remaining)}</span> more
        for free delivery on eligible orders
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function CheckoutTableHeader() {
  return (
    <div className="hidden border-b border-stone-200 bg-stone-50 px-6 py-3 lg:grid lg:grid-cols-12 lg:gap-4">
      <div className="col-span-6 text-sm font-semibold text-stone-700">Product</div>
      <div className="col-span-2 text-right text-sm font-semibold text-stone-700">Price</div>
      <div className="col-span-2 text-center text-sm font-semibold text-stone-700">Qty</div>
      <div className="col-span-2 text-right text-sm font-semibold text-stone-700">Subtotal</div>
    </div>
  )
}

export function CheckoutProductMeta({ product, productPath, showDescription = true }) {
  return (
    <>
      <Link
        to={productPath}
        className="line-clamp-2 text-sm font-medium capitalize text-stone-900 hover:text-indigo-700 lg:text-base"
      >
        {product.name}
      </Link>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500">
        {product.color && <span className="capitalize">Colour: {product.color}</span>}
        {product.size && <span>Size: {product.size}</span>}
      </div>
      {showDescription && (
        <ProductDescriptionSnippet
          description={product.description}
          productPath={productPath}
          className="mt-1.5 hidden sm:block"
        />
      )}
    </>
  )
}
