import { useState } from 'react'

const chipClass =
  'rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50'

const outlineChipClass =
  'rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-indigo-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50'

export default function ChatQuickActions({
  actions = [],
  quantityInput = false,
  onSelect,
  disabled = false,
}) {
  const [qty, setQty] = useState('1')

  if (!actions.length && !quantityInput) return null

  const handleQtyAdd = () => {
    const n = Math.max(1, Math.min(999, parseInt(qty, 10) || 1))
    onSelect?.(`add ${n} to cart`)
  }

  return (
    <div className="mt-3">
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(action.message)}
              className={action.variant === 'outline' ? outlineChipClass : chipClass}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {quantityInput && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Qty</span>
          <input
            type="number"
            min={1}
            max={999}
            value={qty}
            disabled={disabled}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleQtyAdd()
              }
            }}
            className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-center text-xs font-semibold text-stone-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Quantity"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={handleQtyAdd}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to cart
          </button>
        </div>
      )}
    </div>
  )
}
