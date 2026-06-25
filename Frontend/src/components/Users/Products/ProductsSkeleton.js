export default function ProductsSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm"
        >
          <div className="skeleton-shimmer aspect-square bg-stone-100 sm:aspect-[4/5]" />
          <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
            <div className="skeleton-shimmer h-3 w-1/3 rounded bg-stone-100" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded bg-stone-100" />
            <div className="skeleton-shimmer h-4 w-3/5 rounded bg-stone-100" />
            <div className="skeleton-shimmer mt-1 h-3 w-1/4 rounded bg-stone-100" />
            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <div className="skeleton-shimmer h-5 w-16 rounded bg-stone-100" />
              <div className="skeleton-shimmer h-7 w-14 rounded-lg bg-stone-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
