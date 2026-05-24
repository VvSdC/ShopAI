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
