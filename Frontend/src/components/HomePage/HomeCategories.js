import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCategoriesAction } from '../../redux/slices/categories/categoriesSlice'
import CategoryCard from './CategoryCard'

export default function HomeCategories() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchCategoriesAction())
  }, [dispatch])

  const { categories } = useSelector((state) => state?.categories)

  const categoriesToShow = useMemo(() => {
    const list = [...(categories?.categories ?? [])]
    return list
      .sort(
        (a, b) =>
          (b?.productCount ?? 0) -
          (a?.productCount ?? 0)
      )
      .slice(0, 5)
  }, [categories?.categories])

  if (categoriesToShow.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="skeleton-shimmer aspect-[4/3] w-full bg-stone-100" />
            <div className="flex items-center justify-between gap-2 border-t border-stone-100 px-3 py-2.5">
              <div className="flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-3.5 w-2/3 rounded bg-stone-100" />
                <div className="skeleton-shimmer h-2.5 w-1/2 rounded bg-stone-100" />
              </div>
              <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-full bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
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
