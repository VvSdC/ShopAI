import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export const CATEGORY_IMAGE_CLASS =
  'relative aspect-[4/3] w-full max-h-[9.375rem] overflow-hidden bg-stone-100 sm:max-h-[10.625rem]'

const FEATURED_IMAGE_CLASS =
  'relative aspect-[16/10] w-full overflow-hidden bg-stone-100'

export default function CategoryCard({ category, className = '', featured = false }) {
  const count = category?.products?.length ?? 0
  const imageWrapClass = featured ? FEATURED_IMAGE_CLASS : CATEGORY_IMAGE_CLASS

  return (
    <Link
      to={`/products-filters?category=${encodeURIComponent(category.name)}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${className}`}
    >
      <div className={imageWrapClass}>
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-2xl font-bold text-indigo-600">
            {category.name?.charAt(0)}
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-stone-700 shadow-sm">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div
        className={`flex items-center justify-between gap-2 border-t border-stone-100 bg-white ${
          featured ? 'px-4 py-3.5' : 'px-3 py-2.5 sm:px-4 sm:py-3'
        }`}
      >
        <div className="min-w-0">
          <p
            className={`truncate font-bold capitalize text-stone-900 ${
              featured ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
            }`}
          >
            {category.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-indigo-600 group-hover:underline sm:text-sm">
            Shop {category.name}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition group-hover:bg-indigo-600 group-hover:text-white">
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
