import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { fetchCategoriesAction } from '../../redux/slices/categories/categoriesSlice'

/** Image frame — same size on every card (your +25% sizing) */
const CATEGORY_IMAGE_CLASS =
  'relative aspect-[4/3] w-full max-h-[9.375rem] overflow-hidden bg-stone-100 sm:max-h-[10.625rem]'

export default function HomeCategories() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchCategoriesAction())
  }, [dispatch])

  const { categories } = useSelector((state) => state?.categories)

  const categoriesToShow = useMemo(() => {
    const list = [...(categories?.categories ?? [])]
    return list
      .sort((a, b) => (b?.products?.length ?? 0) - (a?.products?.length ?? 0))
      .slice(0, 5)
  }, [categories?.categories])

  if (categoriesToShow.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-stone-500">Categories loading…</p>
    )
  }

  return (
    <>
      <div className="relative sm:hidden">
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-stone-50 to-transparent" />
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {categoriesToShow.map((category) => (
            <CategoryCard
              key={category._id || category.name}
              category={category}
              className="w-44 shrink-0 snap-center sm:w-48"
            />
          ))}
        </div>
      </div>

      <div className="hidden gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {categoriesToShow.map((category) => (
          <CategoryCard key={category._id || category.name} category={category} />
        ))}
      </div>
    </>
  )
}

function CategoryCard({ category, className = '' }) {
  const count = category?.products?.length ?? 0

  return (
    <Link
      to={`/products-filters?category=${category.name}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${className}`}
    >
      <div className={CATEGORY_IMAGE_CLASS}>
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-xl font-bold text-indigo-600">
            {category.name?.charAt(0)}
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 shadow-sm">
          {count} items
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-stone-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold capitalize text-stone-900 sm:text-base">
            {category.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-indigo-600 group-hover:underline">
            Shop now
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition group-hover:bg-indigo-600 group-hover:text-white">
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
