function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function ShopPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  loading,
}) {
  if (total <= 0) return null

  const summaryLabel = `Page ${page} of ${totalPages}`

  const pages = []
  const maxVisible = 5
  let from = Math.max(1, page - 2)
  let to = Math.min(totalPages, from + maxVisible - 1)
  from = Math.max(1, to - maxVisible + 1)
  for (let i = from; i <= to; i++) pages.push(i)

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-col items-center gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-stone-600">
        <span className="font-medium text-stone-900">{summaryLabel}</span>
      </p>

      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {from > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="min-w-[2.25rem] rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              1
            </button>
            {from > 2 && <span className="px-1 text-stone-400">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={classNames(
              p === page
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-stone-200 text-stone-700 hover:bg-stone-50',
              'min-w-[2.25rem] rounded-lg border px-2 py-2 text-sm font-medium'
            )}
          >
            {p}
          </button>
        ))}

        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span className="px-1 text-stone-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="min-w-[2.25rem] rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
      )}
    </nav>
  )
}
