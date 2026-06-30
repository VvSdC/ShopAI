import { Link } from 'react-router-dom'
import { formatInr } from '../chatFormattingUtils'

export default function CartSummaryCard({ cart }) {
  if (!cart?.items?.length) return null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 bg-stone-50 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Your cart</p>
      </div>
      <ul className="divide-y divide-stone-100">
        {cart.items.map((item) => (
          <li key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 px-4 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[9px] text-stone-400">
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">{item.name}</p>
              <p className="text-xs text-stone-500">
                {item.qty} × {item.size}
                {item.color ? ` · ${item.color}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-stone-900">
              {formatInr(item.totalPrice)}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-3">
        <span className="text-sm text-stone-600">
          {cart.itemCount} unit{cart.itemCount === 1 ? '' : 's'}
        </span>
        <span className="text-sm font-bold text-stone-900">{formatInr(cart.total)}</span>
      </div>
      <div className="border-t border-stone-100 px-4 py-2">
        <Link
          to="/shopping-cart"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Open full cart →
        </Link>
      </div>
    </div>
  )
}
