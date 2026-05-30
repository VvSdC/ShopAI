export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{message}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 rounded-md py-2.5 px-4 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
