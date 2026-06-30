const NEW_ADDRESS_MESSAGE = 'I want to add a new shipping address'

export default function AddressPickerCards({ addresses = [], onSelect, disabled = false }) {
  if (!addresses.length) return null

  return (
    <div className="mt-3 grid gap-2">
      {addresses.map((addr) => (
        <button
          key={addr.choiceNumber ?? `${addr.city}-${addr.postalCode}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect?.(String(addr.choiceNumber ?? ''))}
          className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-left transition hover:border-indigo-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {addr.choiceNumber ?? '?'}
            </span>
            <div className="min-w-0">
              {addr.name && (
                <p className="text-sm font-semibold text-stone-900">{addr.name}</p>
              )}
              <p className="text-sm text-stone-800">
                <strong>{addr.city}</strong>
                {addr.province ? `, ${addr.province}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {addr.address}
                {addr.postalCode ? ` · ${addr.postalCode}` : ''}
              </p>
            </div>
          </div>
        </button>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect?.(NEW_ADDRESS_MESSAGE)}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-lg leading-none">+</span>
        New address
      </button>
    </div>
  )
}
