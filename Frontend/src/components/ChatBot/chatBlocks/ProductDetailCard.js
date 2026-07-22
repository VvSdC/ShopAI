import { Link } from 'react-router-dom'
import { formatInr, stockBadge } from '../chatFormattingUtils'
import MarkdownContent from '../../common/MarkdownContent'

export default function ProductDetailCard({ product }) {
  if (!product) return null

  const stock = stockBadge(product.qtyLeft, product.inStock)
  const url = product.productUrl || `/products/${product.id}`
  const colors =
    Array.isArray(product.colors) && product.colors.length
      ? product.colors.slice(0, 4).join(', ')
      : null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-stone-100 sm:w-36 sm:aspect-auto sm:min-h-[9rem]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[8rem] items-center justify-center text-xs text-stone-400">
              No image
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-stone-900">{product.name}</h3>
            <span className="text-base font-bold text-stone-900">{formatInr(product.price)}</span>
          </div>

          {product.description && (
            <div className="mt-2 max-h-24 overflow-hidden text-sm leading-relaxed text-stone-600 [&>div>*:first-child]:!mt-0 [&_p]:!mt-1 [&_p]:!text-sm [&_p]:!text-stone-600 [&_ul]:!mt-1 [&_ol]:!mt-1 [&_h3]:!mt-2 [&_h4]:!mt-2 [&_h5]:!mt-2 [&_h3]:!text-sm [&_h4]:!text-sm [&_h5]:!text-sm">
              <MarkdownContent>{product.description}</MarkdownContent>
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-stone-600">
            {product.brand && (
              <>
                <dt className="font-medium text-stone-500">Brand</dt>
                <dd>{product.brand}</dd>
              </>
            )}
            {product.category && (
              <>
                <dt className="font-medium text-stone-500">Category</dt>
                <dd>{product.category}</dd>
              </>
            )}
            <dt className="font-medium text-stone-500">Stock</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${stock.className}`}
              >
                {stock.label}
              </span>
            </dd>
            {product.sizeSummary && (
              <>
                <dt className="font-medium text-stone-500">
                  {product.sizeLabel || 'Sizes'}
                </dt>
                <dd>{product.sizeSummary}</dd>
              </>
            )}
            {colors && (
              <>
                <dt className="font-medium text-stone-500">Colors</dt>
                <dd>{colors}</dd>
              </>
            )}
          </dl>

          <div className="mt-4">
            <Link
              to={url}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              View full details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
